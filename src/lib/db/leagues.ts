import { createClient } from "@/lib/supabase/client";
import type { League } from "@/types";

export async function getMyLeagues(userId: string): Promise<League[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("league_members")
    .select("leagues(*)")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.leagues as unknown as League).filter(Boolean);
}

export async function getLeagueByInviteCode(code: string): Promise<League | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leagues")
    .select("*")
    .eq("invite_code", code.toUpperCase())
    .eq("is_active", true)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

export async function createLeague(name: string, ownerId: string): Promise<League> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("leagues")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) throw new Error("Puoi creare una sola lega. Elimina quella esistente per crearne una nuova.");

  const { data, error } = await supabase
    .from("leagues")
    .insert({ name, owner_id: ownerId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function joinLeague(leagueId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("league_members")
    .upsert({ league_id: leagueId, user_id: userId }, { onConflict: "league_id,user_id", ignoreDuplicates: true });

  if (error) throw new Error(error.message);
}

export async function isLeagueOwner(leagueId: string, userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("leagues")
    .select("id")
    .eq("id", leagueId)
    .eq("owner_id", userId)
    .single();

  return !!data;
}

export async function updateLeague(leagueId: string, updates: Partial<Pick<League, "name">>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("leagues").update(updates).eq("id", leagueId);
  if (error) throw new Error(error.message);
}

export interface LeagueMemberDetail {
  user_id: string;
  joined_at: string;
  team_name: string;
  manager_name: string;
  total_points: number;
}

export async function getLeagueMembers(leagueId: string): Promise<LeagueMemberDetail[]> {
  const supabase = createClient();

  const { data: members, error: membersError } = await supabase
    .from("league_members")
    .select("user_id, joined_at")
    .eq("league_id", leagueId);

  if (membersError) throw new Error(membersError.message);
  if (!members || members.length === 0) return [];

  const userIds = members.map((m) => m.user_id);

  const [{ data: profiles }, { data: teams }] = await Promise.all([
    supabase.from("profiles").select("id, team_name, manager_name").in("id", userIds),
    supabase.from("user_teams").select("user_id, total_points").eq("league_id", leagueId).in("user_id", userIds),
  ]);

  return members.map((m) => {
    const profile = (profiles ?? []).find((p) => p.id === m.user_id);
    const team = (teams ?? []).find((t) => t.user_id === m.user_id);
    return {
      user_id: m.user_id,
      joined_at: m.joined_at,
      team_name: profile?.team_name ?? "—",
      manager_name: profile?.manager_name ?? "—",
      total_points: team?.total_points ?? 0,
    };
  });
}

export async function kickMember(leagueId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("league_members")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function leaveLeague(leagueId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("league_members")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function deleteLeague(leagueId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("leagues").delete().eq("id", leagueId);
  if (error) throw new Error(error.message);
}
