import { createClient } from "@/lib/supabase/client";
import type { AppSettings, Sponsor, SpecialCard, TournamentRules, RuleEntry } from "@/types";

export async function getAppSettings(): Promise<AppSettings | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

export async function updateAppSettings(updates: Partial<AppSettings>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ id: "singleton", ...updates, updated_at: new Date().toISOString() });

  if (error) throw new Error(error.message);
}

export async function getSponsors(): Promise<Sponsor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .eq("is_active", true)
    .order("type")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAllSponsors(): Promise<Sponsor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .order("type")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertSponsor(sponsor: Partial<Sponsor>): Promise<Sponsor> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .upsert(sponsor)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSponsor(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("sponsors").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getSpecialCards(): Promise<SpecialCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("special_cards")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertSpecialCard(card: Partial<SpecialCard>): Promise<SpecialCard> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("special_cards")
    .upsert(card)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSpecialCard(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("special_cards").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getTournamentRules(): Promise<TournamentRules | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tournament_rules")
    .select("*")
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

export async function updateTournamentRules(updates: Partial<TournamentRules>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tournament_rules")
    .upsert({ id: "singleton", ...updates, updated_at: new Date().toISOString() });

  if (error) throw new Error(error.message);
}

export async function getFantasyRules(): Promise<RuleEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fantasy_rules")
    .select("*")
    .order("type")
    .order("label");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertFantasyRule(rule: Partial<RuleEntry>): Promise<RuleEntry> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("fantasy_rules")
    .upsert(rule)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteFantasyRule(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("fantasy_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
