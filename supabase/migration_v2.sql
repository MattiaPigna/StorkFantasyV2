-- =============================================
-- MIGRATION V2 - Multi-tenant SaaS
-- Eseguire nel SQL Editor di Supabase
-- =============================================

-- 1. LEAGUES TABLE
create table if not exists public.leagues (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid references auth.users on delete cascade not null,
  invite_code text unique not null default upper(substring(replace(uuid_generate_v4()::text, '-', ''), 1, 8)),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. LEAGUE MEMBERS TABLE
create table if not exists public.league_members (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid references public.leagues on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  joined_at timestamptz not null default now(),
  unique(league_id, user_id)
);

-- 3. ADD league_id TO EXISTING TABLES (nullable for backwards compat)
alter table public.players add column if not exists league_id uuid references public.leagues on delete cascade;
alter table public.matchdays add column if not exists league_id uuid references public.leagues on delete cascade;
alter table public.user_teams add column if not exists league_id uuid references public.leagues on delete cascade;
alter table public.sponsors add column if not exists league_id uuid references public.leagues on delete cascade;
alter table public.fantasy_rules add column if not exists league_id uuid references public.leagues on delete cascade;
alter table public.special_cards add column if not exists league_id uuid references public.leagues on delete cascade;
alter table public.app_settings add column if not exists league_id uuid references public.leagues on delete cascade;
alter table public.tournament_rules add column if not exists league_id uuid references public.leagues on delete cascade;

-- 4. DROP old unique constraints that don't account for league_id
alter table public.players drop constraint if exists players_name_key;
alter table public.fantasy_rules drop constraint if exists fantasy_rules_key_key;

-- 5. UPDATE user_teams unique constraint (one team per user per league)
alter table public.user_teams drop constraint if exists user_teams_user_id_key;
alter table public.user_teams add constraint user_teams_user_league_unique unique (user_id, league_id);

-- 6. RLS for leagues
alter table public.leagues enable row level security;
create policy "Anyone can view active leagues" on public.leagues for select using (is_active = true);
create policy "Owners can manage their league" on public.leagues for all using (auth.uid() = owner_id);

-- 7. RLS for league_members
alter table public.league_members enable row level security;
create policy "Members can view league members" on public.league_members for select using (
  exists (select 1 from public.league_members lm where lm.league_id = league_members.league_id and lm.user_id = auth.uid())
  or exists (select 1 from public.leagues l where l.id = league_members.league_id and l.owner_id = auth.uid())
);
create policy "Anyone can join a league" on public.league_members for insert with check (auth.uid() = user_id);
create policy "Members can leave" on public.league_members for delete using (auth.uid() = user_id);

-- 8. UPDATE existing RLS policies to filter by league_id
-- Players: allow members of the league to see players
drop policy if exists "Anyone can view active players" on public.players;
drop policy if exists "Admins can manage players" on public.players;
create policy "League members can view players" on public.players for select using (
  league_id is null or
  exists (select 1 from public.league_members where league_id = players.league_id and user_id = auth.uid())
);
create policy "League owners can manage players" on public.players for all using (
  exists (select 1 from public.leagues where id = players.league_id and owner_id = auth.uid())
);

-- Matchdays
drop policy if exists "Anyone authenticated can view matchdays" on public.matchdays;
drop policy if exists "Admins can manage matchdays" on public.matchdays;
create policy "League members can view matchdays" on public.matchdays for select using (
  league_id is null or
  exists (select 1 from public.league_members where league_id = matchdays.league_id and user_id = auth.uid())
);
create policy "League owners can manage matchdays" on public.matchdays for all using (
  exists (select 1 from public.leagues where id = matchdays.league_id and owner_id = auth.uid())
);

-- User teams
drop policy if exists "Users can view all teams" on public.user_teams;
drop policy if exists "Users can update own team" on public.user_teams;
create policy "League members can view teams" on public.user_teams for select using (
  league_id is null or
  exists (select 1 from public.league_members where league_id = user_teams.league_id and user_id = auth.uid())
);
create policy "Users can manage own team" on public.user_teams for all using (auth.uid() = user_id);

-- Sponsors
drop policy if exists "Anyone can view active sponsors" on public.sponsors;
drop policy if exists "Admins can manage sponsors" on public.sponsors;
create policy "League members can view sponsors" on public.sponsors for select using (
  is_active = true and (
    league_id is null or
    exists (select 1 from public.league_members where league_id = sponsors.league_id and user_id = auth.uid())
  )
);
create policy "League owners can manage sponsors" on public.sponsors for all using (
  exists (select 1 from public.leagues where id = sponsors.league_id and owner_id = auth.uid())
);

-- App settings
drop policy if exists "Anyone authenticated can view settings" on public.app_settings;
drop policy if exists "Admins can update settings" on public.app_settings;
create policy "League members can view settings" on public.app_settings for select using (
  league_id is null or
  exists (select 1 from public.league_members where league_id = app_settings.league_id and user_id = auth.uid())
);
create policy "League owners can manage settings" on public.app_settings for all using (
  exists (select 1 from public.leagues where id = app_settings.league_id and owner_id = auth.uid())
);

-- Fantasy rules
drop policy if exists "Anyone authenticated can view rules" on public.fantasy_rules;
drop policy if exists "Admins can manage rules" on public.fantasy_rules;
create policy "League members can view rules" on public.fantasy_rules for select using (
  league_id is null or
  exists (select 1 from public.league_members where league_id = fantasy_rules.league_id and user_id = auth.uid())
);
create policy "League owners can manage rules" on public.fantasy_rules for all using (
  exists (select 1 from public.leagues where id = fantasy_rules.league_id and owner_id = auth.uid())
);

-- Player match stats (filtrate tramite matchday)
drop policy if exists "Anyone authenticated can view stats" on public.player_match_stats;
drop policy if exists "Admins can manage stats" on public.player_match_stats;
create policy "League members can view stats" on public.player_match_stats for select using (
  exists (
    select 1 from public.matchdays m
    join public.league_members lm on lm.league_id = m.league_id
    where m.id = player_match_stats.matchday_id and lm.user_id = auth.uid()
  )
);
create policy "League owners can manage stats" on public.player_match_stats for all using (
  exists (
    select 1 from public.matchdays m
    join public.leagues l on l.id = m.league_id
    where m.id = player_match_stats.matchday_id and l.owner_id = auth.uid()
  )
);

-- Special cards
drop policy if exists "Anyone authenticated can view cards" on public.special_cards;
drop policy if exists "Admins can manage cards" on public.special_cards;
create policy "League members can view cards" on public.special_cards for select using (
  league_id is null or
  exists (select 1 from public.league_members where league_id = special_cards.league_id and user_id = auth.uid())
);
create policy "League owners can manage cards" on public.special_cards for all using (
  exists (select 1 from public.leagues where id = special_cards.league_id and owner_id = auth.uid())
);

-- Tournament rules
drop policy if exists "Anyone authenticated can view tournament" on public.tournament_rules;
drop policy if exists "Admins can manage tournament" on public.tournament_rules;
create policy "League members can view tournament" on public.tournament_rules for select using (
  league_id is null or
  exists (select 1 from public.league_members where league_id = tournament_rules.league_id and user_id = auth.uid())
);
create policy "League owners can manage tournament" on public.tournament_rules for all using (
  exists (select 1 from public.leagues where id = tournament_rules.league_id and owner_id = auth.uid())
);

-- 9. UPDATE standings_view to filter by league
drop view if exists public.standings_view;
create or replace view public.standings_view as
  select
    p.id as user_id,
    p.team_name,
    p.manager_name,
    t.total_points,
    t.league_id
  from public.profiles p
  join public.user_teams t on t.user_id = p.id
  order by t.total_points desc;

-- 10. UPDATE calculate_matchday_results RPC to be league-aware (already filters by matchday_id which belongs to a league)
-- No changes needed - the function already works per-matchday

-- 11. UPDATE reset_all_standings to accept league_id
create or replace function public.reset_league_standings(p_league_id uuid)
returns void as $$
begin
  update public.user_teams set total_points = 0, matchday_points = '{}' where league_id = p_league_id;
  update public.matchdays set status = 'open' where status = 'calculated' and league_id = p_league_id;
end;
$$ language plpgsql security definer;

-- 12. Auto-create league_member for league owner when league is created
create or replace function public.handle_new_league()
returns trigger as $$
begin
  insert into public.league_members (league_id, user_id)
  values (new.id, new.owner_id);

  -- Auto-create app_settings for new league
  insert into public.app_settings (id, league_id, market_open, lineup_locked, max_players_per_team, lineup_size, initial_credits, updated_at)
  values (uuid_generate_v4(), new.id, true, false, 15, 11, 250, now())
  on conflict do nothing;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_league_created
  after insert on public.leagues
  for each row execute procedure public.handle_new_league();

-- 13. Auto-create user_team when user joins a league
create or replace function public.handle_new_league_member()
returns trigger as $$
declare
  v_initial_credits integer;
begin
  -- Get league's initial credits setting
  select coalesce(initial_credits, 250) into v_initial_credits
  from public.app_settings
  where league_id = new.league_id
  limit 1;

  -- Create user team for this league if it doesn't exist
  insert into public.user_teams (user_id, league_id, players, lineup, credits, total_points, matchday_points)
  values (new.user_id, new.league_id, '{}', '[]', v_initial_credits, 0, '{}')
  on conflict (user_id, league_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_league_member_added
  after insert on public.league_members
  for each row execute procedure public.handle_new_league_member();
