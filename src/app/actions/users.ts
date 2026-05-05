"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Elimina un utente completamente: rimuove league_members, user_teams,
 * poi cancella l'account da Supabase Auth (che in cascade elimina profiles).
 * Solo admin o superadmin possono chiamare questa funzione.
 */
export async function deleteUserCompletely(targetUserId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, is_super_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin && !profile?.is_super_admin) {
    return { error: "Non autorizzato" };
  }

  try {
    const admin = createAdminClient();

    // Pulizia esplicita (le CASCADE nel DB dovrebbero già gestirlo,
    // ma meglio essere sicuri con RLS attivo)
    await supabase.from("league_members").delete().eq("user_id", targetUserId);
    await supabase.from("user_teams").delete().eq("user_id", targetUserId);

    const { error } = await admin.auth.admin.deleteUser(targetUserId);
    if (error) return { error: error.message };

    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Errore sconosciuto" };
  }
}
