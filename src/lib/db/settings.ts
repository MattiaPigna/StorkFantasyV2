import { createClient } from "@/lib/supabase/client";
import type { AppSettings, Sponsor, SpecialCard, TournamentRules, RuleEntry } from "@/types";

export async function getAppSettings(leagueId: string): Promise<AppSettings | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("league_id", leagueId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  if (!data) return null;
  return { lineup_size: 11, ...data };
}

export async function updateAppSettings(leagueId: string, updates: Partial<AppSettings>): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...safeUpdates } = updates as AppSettings & { id?: string };
  const { data, error } = await supabase
    .from("app_settings")
    .update({ ...safeUpdates, updated_at: new Date().toISOString() })
    .eq("league_id", leagueId)
    .select("id");

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Permesso negato: impossibile aggiornare le impostazioni.");
}

export async function getSponsors(leagueId: string): Promise<Sponsor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .eq("league_id", leagueId)
    .eq("is_active", true)
    .order("type")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAllSponsors(leagueId: string): Promise<Sponsor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .eq("league_id", leagueId)
    .order("type")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertSponsor(leagueId: string, sponsor: Partial<Sponsor>): Promise<Sponsor> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .upsert({ ...sponsor, league_id: leagueId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSponsor(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("sponsors").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getSpecialCards(leagueId: string): Promise<SpecialCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("special_cards")
    .select("*")
    .eq("league_id", leagueId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertSpecialCard(leagueId: string, card: Partial<SpecialCard>): Promise<SpecialCard> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("special_cards")
    .upsert({ ...card, league_id: leagueId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSpecialCard(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("special_cards").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getTournamentRules(leagueId: string): Promise<TournamentRules | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tournament_rules")
    .select("*")
    .eq("league_id", leagueId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

export async function updateTournamentRules(leagueId: string, updates: Partial<TournamentRules>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tournament_rules")
    .upsert({ ...updates, league_id: leagueId, updated_at: new Date().toISOString() }, { onConflict: "league_id" });

  if (error) throw new Error(error.message);
}

export async function getFantasyRules(leagueId: string): Promise<RuleEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fantasy_rules")
    .select("*")
    .eq("league_id", leagueId)
    .order("type")
    .order("label");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertFantasyRule(leagueId: string, rule: Partial<RuleEntry>): Promise<RuleEntry> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fantasy_rules")
    .upsert({ ...rule, league_id: leagueId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteFantasyRule(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("fantasy_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
