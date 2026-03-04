import { createClient } from "@/lib/supabase/client";
import type { Player } from "@/types";

export async function getPlayers(): Promise<Player[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("role")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAllPlayers(): Promise<Player[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("role")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPlayer(player: Omit<Player, "id" | "created_at">): Promise<Player> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("players")
    .insert(player)
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
