-- =============================================
-- FIX RLS POLICIES + SET ADMIN
-- Esegui tutto questo nel SQL Editor di Supabase
-- =============================================

-- 1. Imposta il tuo account come admin
UPDATE public.profiles SET is_admin = true WHERE email = 'mattiapignatiel@gmail.com';

-- 2. Crea funzione helper sicura per il check admin
--    (security definer = gira con i permessi del creatore, bypassa RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Ricrea tutte le policy admin usando la funzione helper

-- PLAYERS
DROP POLICY IF EXISTS "Admins can manage players" ON public.players;
CREATE POLICY "Admins can manage players" ON public.players
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- MATCHDAYS
DROP POLICY IF EXISTS "Admins can manage matchdays" ON public.matchdays;
CREATE POLICY "Admins can manage matchdays" ON public.matchdays
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PLAYER MATCH STATS
DROP POLICY IF EXISTS "Admins can manage stats" ON public.player_match_stats;
CREATE POLICY "Admins can manage stats" ON public.player_match_stats
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- APP SETTINGS
DROP POLICY IF EXISTS "Admins can update settings" ON public.app_settings;
CREATE POLICY "Admins can update settings" ON public.app_settings
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- FANTASY RULES
DROP POLICY IF EXISTS "Admins can manage rules" ON public.fantasy_rules;
CREATE POLICY "Admins can manage rules" ON public.fantasy_rules
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- TOURNAMENT RULES
DROP POLICY IF EXISTS "Admins can manage tournament" ON public.tournament_rules;
CREATE POLICY "Admins can manage tournament" ON public.tournament_rules
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SPECIAL CARDS
DROP POLICY IF EXISTS "Admins can manage cards" ON public.special_cards;
CREATE POLICY "Admins can manage cards" ON public.special_cards
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SPONSORS
DROP POLICY IF EXISTS "Admins can manage sponsors" ON public.sponsors;
CREATE POLICY "Admins can manage sponsors" ON public.sponsors
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PROFILES (admin può vedere e modificare tutti i profili)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());
