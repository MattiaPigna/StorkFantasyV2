import { createClient } from "@/lib/supabase/client";

export interface DailyMatch {
  id: string;
  league_id: string;
  home_team: string;
  away_team: string;
  match_datetime: string;
  competition: string;
  created_at: string;
}

export async function getDailyMatches(leagueId: string): Promise<DailyMatch[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_matches")
    .select("*")
    .eq("league_id", leagueId)
    .order("match_datetime", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createDailyMatch(
  leagueId: string,
  match: Pick<DailyMatch, "home_team" | "away_team" | "match_datetime" | "competition">
): Promise<DailyMatch> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_matches")
    .insert({ ...match, league_id: leagueId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDailyMatch(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("daily_matches").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
