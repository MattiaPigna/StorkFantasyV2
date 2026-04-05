/**
 * P2P Market DB functions.
 *
 * Requires a `market_listings` table in Supabase:
 *
 *   create table market_listings (
 *     id              uuid primary key default gen_random_uuid(),
 *     league_id       uuid not null references leagues(id) on delete cascade,
 *     player_id       uuid not null references players(id) on delete cascade,
 *     seller_id       uuid not null references profiles(id) on delete cascade,
 *     seller_team_id  uuid not null references user_teams(id) on delete cascade,
 *     price           integer not null check (price > 0),
 *     created_at      timestamptz not null default now()
 *   );
 *
 *   -- RLS: anyone in the league can read; only the seller can delete.
 *   alter table market_listings enable row level security;
 *   create policy "league members can read" on market_listings for select using (true);
 *   create policy "seller can insert" on market_listings for insert with check (seller_id = auth.uid());
 *   create policy "seller can delete" on market_listings for delete using (seller_id = auth.uid());
 */

import { createClient } from "@/lib/supabase/client";
import type { MarketListing } from "@/types";

export async function getMarketListings(leagueId: string): Promise<MarketListing[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("market_listings")
    .select("*, player:players(*), seller:profiles(*)")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as MarketListing[];
}

export async function createListing(
  leagueId: string,
  sellerUserId: string,
  sellerTeamId: string,
  playerId: string,
  price: number
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("market_listings").insert({
    league_id: leagueId,
    seller_id: sellerUserId,
    seller_team_id: sellerTeamId,
    player_id: playerId,
    price,
  });
  if (error) throw new Error(error.message);
}

export async function cancelListing(listingId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("market_listings").delete().eq("id", listingId);
  if (error) throw new Error(error.message);
}

/**
 * Buy a P2P listing. Operations are sequential (not atomic).
 * For full atomicity, replace with a Supabase RPC.
 */
export async function buyFromListing(
  listingId: string,
  buyerTeamId: string,
  buyerPlayers: string[],
  buyerCredits: number,
  maxRosterSize: number
): Promise<void> {
  const supabase = createClient();

  // Fetch fresh listing to avoid acting on stale UI state
  const { data: listing, error: lErr } = await supabase
    .from("market_listings")
    .select("*")
    .eq("id", listingId)
    .single();
  if (lErr || !listing) throw new Error("Annuncio non più disponibile");

  if (buyerCredits < listing.price) throw new Error("Crediti insufficienti");
  if (buyerPlayers.includes(listing.player_id)) throw new Error("Hai già questo giocatore");
  if (buyerPlayers.length >= maxRosterSize) throw new Error("Rosa piena");

  // Fetch seller's current team state
  const { data: sellerTeam, error: sErr } = await supabase
    .from("user_teams")
    .select("players, credits")
    .eq("id", listing.seller_team_id)
    .single();
  if (sErr || !sellerTeam) throw new Error("Errore nel recupero del venditore");

  // Delete listing first — if this fails the listing was already gone
  const { error: delErr } = await supabase
    .from("market_listings")
    .delete()
    .eq("id", listingId);
  if (delErr) throw new Error("Annuncio non più disponibile");

  // Update seller: remove player, credit proceeds
  const { error: sellErr } = await supabase
    .from("user_teams")
    .update({
      players: (sellerTeam.players as string[]).filter((id) => id !== listing.player_id),
      credits: sellerTeam.credits + listing.price,
    })
    .eq("id", listing.seller_team_id);
  if (sellErr) throw new Error("Errore aggiornamento venditore");

  // Update buyer: add player, deduct credits
  const { error: buyErr } = await supabase
    .from("user_teams")
    .update({
      players: [...buyerPlayers, listing.player_id],
      credits: buyerCredits - listing.price,
    })
    .eq("id", buyerTeamId);
  if (buyErr) throw new Error("Errore aggiornamento acquirente");
}
