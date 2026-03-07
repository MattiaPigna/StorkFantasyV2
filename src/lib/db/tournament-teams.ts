import { createClient } from "@/lib/supabase/client";

export interface TournamentTeam {
  id: string;
  league_id: string;
  name: string;
  logo_url: string | null;
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

export async function uploadTeamLogo(teamId: string, file: File): Promise<string> {
  const supabase = createClient();
  const path = `${teamId}.webp`;

  const { error: uploadError } = await supabase.storage
    .from("team-logos")
    .upload(path, file, { upsert: true, contentType: "image/webp" });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from("team-logos").getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("tournament_teams")
    .update({ logo_url: data.publicUrl })
    .eq("id", teamId);

  if (updateError) throw new Error(updateError.message);

  return data.publicUrl;
}

export async function removeTeamLogo(teamId: string): Promise<void> {
  const supabase = createClient();
  const { error: storageError } = await supabase.storage.from("team-logos").remove([`${teamId}.webp`]);
  if (storageError) throw new Error(storageError.message);
  const { error } = await supabase.from("tournament_teams").update({ logo_url: null }).eq("id", teamId);
  if (error) throw new Error(error.message);
}
