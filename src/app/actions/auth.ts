"use server";

import { createClient } from "@/lib/supabase/server";

export async function ensureProfile(teamName?: string, managerName?: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Utente non autenticato" };

  // Fallback ai metadati salvati al momento dell'iscrizione
  const name = teamName ?? user.user_metadata?.team_name ?? "";
  const manager = managerName ?? user.user_metadata?.manager_name ?? "";

  const { error } = await supabase.from("profiles").upsert(
    { id: user.id, team_name: name, manager_name: manager },
    { onConflict: "id" }
  );

  return { error: error?.message ?? null };
}
