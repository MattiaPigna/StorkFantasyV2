import { createClient } from "@/lib/supabase/client";

export interface TournamentTeam {
  id: string;
  league_id: string;
  name: string;
  created_at: string;
}

export async function getTournamentTeams(leagueId: string): Promise<TournamentTeam[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tournament_teams")
    .select("*")
    .eq("league_id", leagueId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createTournamentTeam(leagueId: string, name: string): Promise<TournamentTeam> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tournament_teams")
    .insert({ league_id: leagueId, name })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createTournamentTeams(leagueId: string, names: string[]): Promise<void> {
  const supabase = createClient();
  const rows = names.map((name) => ({ league_id: leagueId, name }));
  const { error } = await supabase.from("tournament_teams").insert(rows);
  if (error) throw new Error(error.message);
}

export async function deleteTournamentTeam(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tournament_teams").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteAllTournamentTeams(leagueId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tournament_teams").delete().eq("league_id", leagueId);
  if (error) throw new Error(error.message);
}
