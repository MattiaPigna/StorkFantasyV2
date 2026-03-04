import { createClient } from "@/lib/supabase/client";
import type { UserTeam, StandingEntry, Profile } from "@/types";

export async function getMyTeam(userId: string): Promise<UserTeam | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_teams")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

export async function updateLineup(teamId: string, lineup: UserTeam["lineup"]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_teams")
    .update({ lineup })
    .eq("id", teamId);

  if (error) throw new Error(error.message);
}

export async function getStandings(): Promise<StandingEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("standings_view")
    .select("*")
    .order("total_points", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row, index) => ({
    rank: index + 1,
    team_name: row.team_name,
    manager_name: row.manager_name,
    total_points: row.total_points,
    user_id: row.user_id,
  }));
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

export async function buyPlayer(
  teamId: string,
  playerId: string,
  price: number,
  currentPlayers: string[],
  currentCredits: number
): Promise<void> {
  if (currentCredits < price) throw new Error("Crediti insufficienti");
  if (currentPlayers.includes(playerId)) throw new Error("Giocatore già nella rosa");

  const supabase = createClient();
  const { error } = await supabase
    .from("user_teams")
    .update({
      players: [...currentPlayers, playerId],
      credits: currentCredits - price,
    })
    .eq("id", teamId);

  if (error) throw new Error(error.message);
}

export async function sellPlayer(
  teamId: string,
  playerId: string,
  price: number,
  currentPlayers: string[],
  currentCredits: number
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_teams")
    .update({
      players: currentPlayers.filter((id) => id !== playerId),
      credits: currentCredits + Math.floor(price * 0.75), // 75% sell price
    })
    .eq("id", teamId);

  if (error) throw new Error(error.message);
}
