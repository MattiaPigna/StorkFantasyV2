import { createClient } from "@/lib/supabase/client";
import type { Matchday, PlayerMatchStats } from "@/types";

export async function getMatchdays(leagueId: string): Promise<Matchday[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("matchdays")
    .select("*")
    .eq("league_id", leagueId)
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

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

export async function createMatchday(leagueId: string, matchday: Pick<Matchday, "number" | "name">): Promise<Matchday> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("matchdays")
    .insert({ ...matchday, status: "open", league_id: leagueId })
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
  const { error } = await supabase.rpc("calculate_matchday_results", {
    p_matchday_id: matchdayId,
  });

  if (error) throw new Error(error.message);
}

export async function getMatchdayStats(matchdayId: string): Promise<Record<string, import("@/types").PlayerMatchStats>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("player_match_stats")
    .select("*")
    .eq("matchday_id", matchdayId);

  if (error) throw new Error(error.message);
  const map: Record<string, import("@/types").PlayerMatchStats> = {};
  (data ?? []).forEach((s) => { map[s.player_id] = s; });
  return map;
}

export async function getPlayerAllStats(playerId: string): Promise<(PlayerMatchStats & { matchday_name: string; matchday_number: number })[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("player_match_stats")
    .select("*, matchday:matchdays(name, number)")
    .eq("player_id", playerId)
    .not("fantasy_points", "is", null);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => {
      const md = row.matchday as unknown as { name: string; number: number } | null;
      return {
        ...(row as PlayerMatchStats),
        matchday_name: md?.name ?? "—",
        matchday_number: md?.number ?? 0,
      };
    })
    .sort((a, b) => a.matchday_number - b.matchday_number);
}

export async function deleteMatchday(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_matchday_safe", { p_matchday_id: id });
  if (error) throw new Error(error.message);
}
