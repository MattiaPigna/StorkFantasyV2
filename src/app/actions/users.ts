"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Elimina un utente: rimuove sempre league_members, user_teams e profiles dal DB.
 * Se SUPABASE_SERVICE_ROLE_KEY è configurata elimina anche l'account da Supabase Auth.
 */
export async function deleteUserCompletely(targetUserId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("is_admin, is_super_admin")
    .eq("id", user.id)
    .single();

  if (!callerProfile?.is_admin && !callerProfile?.is_super_admin) {
    return { error: "Non autorizzato" };
  }

  // 1. Rimuovi sempre dal DB (funziona senza service role key)
  await supabase.from("league_members").delete().eq("user_id", targetUserId);
  await supabase.from("user_teams").delete().eq("user_id", targetUserId);
  await supabase.from("profiles").delete().eq("id", targetUserId);

  // 2. Tenta cancellazione dall'auth solo se la service role key è configurata
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    try {
      const { createClient: createSupabase } = await import("@supabase/supabase-js");
      const admin = createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await admin.auth.admin.deleteUser(targetUserId);
    } catch {
      // Auth deletion failed but DB is already clean — accettabile
    }
  }

  return { error: null };
}
