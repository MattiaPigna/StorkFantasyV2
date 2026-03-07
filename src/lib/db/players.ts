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

export async function deletePlayer(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("players")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export interface TeamStat {
  team: string;
  gol_fatti: number;
  gol_subiti: number;
  diff: number;
  top_scorers: { name: string; goals: number }[];
}

export async function getTeamStats(leagueId: string): Promise<TeamStat[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("player_match_stats")
    .select("goals, assists, goals_conceded, players!inner(name, team, league_id)")
    .eq("players.league_id", leagueId);

  if (error) throw new Error(error.message);

  const teamMap = new Map<string, { gol_fatti: number; gol_subiti: number; scorers: Map<string, number> }>();

  for (const row of data ?? []) {
    const player = row.players as unknown as { name: string; team: string } | null;
    if (!player) continue;
    const team = player.team;
    if (!teamMap.has(team)) teamMap.set(team, { gol_fatti: 0, gol_subiti: 0, scorers: new Map() });
    const entry = teamMap.get(team)!;
    entry.gol_fatti += row.goals ?? 0;
    entry.gol_subiti += row.goals_conceded ?? 0;
    if ((row.goals ?? 0) > 0) {
      entry.scorers.set(player.name, (entry.scorers.get(player.name) ?? 0) + (row.goals ?? 0));
    }
  }

  return Array.from(teamMap.entries())
    .map(([team, { gol_fatti, gol_subiti, scorers }]) => ({
      team,
      gol_fatti,
      gol_subiti,
      diff: gol_fatti - gol_subiti,
      top_scorers: Array.from(scorers.entries())
        .map(([name, goals]) => ({ name, goals }))
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 3),
    }))
    .sort((a, b) => b.gol_fatti - a.gol_fatti);
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
