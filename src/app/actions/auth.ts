"use server";

import { createClient } from "@/lib/supabase/server";

export async function ensureProfile(teamName: string, managerName: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Utente non autenticato" };

  const { error } = await supabase.from("profiles").upsert(
    { id: user.id, team_name: teamName, manager_name: managerName },
    { onConflict: "id" }
  );

  return { error: error?.message ?? null };
}
