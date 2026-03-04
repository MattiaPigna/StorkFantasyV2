import { createClient } from "@/lib/supabase/client";
import type { Matchday, PlayerMatchStats } from "@/types";

export async function getMatchdays(): Promise<Matchday[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("matchdays")
    .select("*")
    .order("number", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMatchdayWithStats(id: string): Promise<Matchday | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("matchdays")
    .select("*, stats:player_match_stats(*)")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createMatchday(matchday: Pick<Matchday, "number" | "name">): Promise<Matchday> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("matchdays")
    .insert({ ...matchday, status: "open" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function savePlayerStats(stats: Omit<PlayerMatchStats, "fantasy_points">[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("player_match_stats")
    .upsert(stats, { onConflict: "player_id,matchday_id" });

  if (error) throw new Error(error.message);
}

export async function calculateMatchdayResults(matchdayId: string): Promise<void> {
  const supabase = createClient();

  // Call a Supabase Edge Function or RPC to calculate results server-side
  const { error } = await supabase.rpc("calculate_matchday_results", {
    p_matchday_id: matchdayId,
  });

  if (error) throw new Error(error.message);
}

export async function deleteMatchday(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("matchdays").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
