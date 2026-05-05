import { createClient } from "@/lib/supabase/client";
import type { Player } from "@/types";

export interface TopScorer {
  player_id: string;
  name: string;
  team: string;
  role: string;
  total_points: number;
  total_goals: number;
  total_assists: number;
  matchdays_played: number;
}

export async function getPlayers(leagueId: string): Promise<Player[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("league_id", leagueId)
    .eq("is_active", true)
    .order("role")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAllPlayers(leagueId: string): Promise<Player[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("league_id", leagueId)
    .order("role")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPlayer(leagueId: string, player: Omit<Player, "id" | "created_at">): Promise<Player> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("players")
    .insert({ ...player, league_id: leagueId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updatePlayer(id: string, updates: Partial<Player>): Promise<Player> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("players")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deletePlayer(id: string, leagueId: string): Promise<void> {
  const supabase = createClient();

  // 1. Hard delete the player
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  // 2. Remove from all user_teams in the league
  const { data: teams } = await supabase
    .from("user_teams")
    .select("id, players, lineup")
    .eq("league_id", leagueId);

  if (!teams) return;

  const affected = teams.filter((t) => (t.players as string[]).includes(id));
  const results = await Promise.all(
    affected.map((t) =>
      supabase.from("user_teams").update({
        players: (t.players as string[]).filter((pid: string) => pid !== id),
        lineup: (t.lineup as { position: number; player_id: string | null }[]).map((slot) =>
          slot.player_id === id ? { ...slot, player_id: null } : slot
        ),
      }).eq("id", t.id)
    )
  );
  const updateError = results.find((r) => r.error);
  if (updateError?.error) throw new Error(updateError.error.message);
}

export async function getTopScorers(leagueId: string): Promise<TopScorer[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("player_match_stats")
    .select("player_id, fantasy_points, goals, assists, players!inner(name, team, role, league_id)")
    .eq("players.league_id", leagueId)
    .not("fantasy_points", "is", null);

  if (error) throw new Error(error.message);

  const map = new Map<string, TopScorer>();
  for (const row of data ?? []) {
    const p = row.players as unknown as { name: string; team: string; role: string } | null;
    if (!p) continue;
    const existing = map.get(row.player_id);
    if (existing) {
      existing.total_points += row.fantasy_points ?? 0;
      existing.total_goals += row.goals ?? 0;
      existing.total_assists += row.assists ?? 0;
      existing.matchdays_played += 1;
    } else {
      map.set(row.player_id, {
        player_id: row.player_id,
        name: p.name,
        team: p.team,
        role: p.role,
        total_points: row.fantasy_points ?? 0,
        total_goals: row.goals ?? 0,
        total_assists: row.assists ?? 0,
        matchdays_played: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total_points - a.total_points);
}
