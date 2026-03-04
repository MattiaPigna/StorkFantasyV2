-- =============================================
-- StorkFantasy V2 - Supabase Schema
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES (extends Supabase auth.users)
-- =============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  team_name text not null,
  manager_name text not null,
  is_admin boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, team_name, manager_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'team_name', 'Team ' || substring(new.id::text, 1, 6)),
    coalesce(new.raw_user_meta_data->>'manager_name', 'Manager')
  );

  insert into public.user_teams (user_id, players, lineup, credits, total_points, matchday_points)
  values (new.id, '{}', '[]', 250, 0, '{}');

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- PLAYERS
-- =============================================
create table public.players (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  team text not null,
  role text not null check (role in ('P', 'D', 'C', 'A')),
  price integer not null default 15 check (price >= 1 and price <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =============================================
-- USER TEAMS
-- =============================================
create table public.user_teams (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles on delete cascade unique not null,
  players uuid[] not null default '{}',
  lineup jsonb not null default '[]',
  credits integer not null default 250,
  total_points numeric not null default 0,
  matchday_points jsonb not null default '{}'
);

-- =============================================
-- MATCHDAYS
-- =============================================
create table public.matchdays (
  id uuid primary key default uuid_generate_v4(),
  number integer not null,
  name text not null,
  status text not null default 'open' check (status in ('open', 'calculated', 'locked')),
  created_at timestamptz not null default now()
);

-- =============================================
-- PLAYER MATCH STATS
-- =============================================
create table public.player_match_stats (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid references public.players on delete cascade not null,
  matchday_id uuid references public.matchdays on delete cascade not null,
  vote numeric(4,1),
  goals integer not null default 0,
  assists integer not null default 0,
  own_goals integer not null default 0,
  yellow_cards integer not null default 0,
  red_cards integer not null default 0,
  penalty_scored integer not null default 0,
  penalty_missed integer not null default 0,
  penalty_saved integer not null default 0,
  fantasy_points numeric,
  unique(player_id, matchday_id)
);

-- =============================================
-- FANTASY RULES
-- =============================================
create table public.fantasy_rules (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  label text not null,
  points numeric not null,
  type text not null check (type in ('bonus', 'malus')),
  description text
);

-- =============================================
-- APP SETTINGS (singleton)
-- =============================================
create table public.app_settings (
  id text primary key default 'singleton',
  market_open boolean not null default true,
  lineup_locked boolean not null default false,
  market_deadline timestamptz,
  youtube_url text,
  marquee_text text,
  max_players_per_team integer not null default 15,
  initial_credits integer not null default 250,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values ('singleton') on conflict do nothing;

-- =============================================
-- SPONSORS
-- =============================================
create table public.sponsors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  website_url text,
  type text not null check (type in ('main', 'partner', 'technical')) default 'partner',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =============================================
-- SPECIAL CARDS
-- =============================================
create table public.special_cards (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null,
  image_url text,
  effect text,
  created_at timestamptz not null default now()
);

-- =============================================
-- TOURNAMENT RULES (singleton)
-- =============================================
create table public.tournament_rules (
  id text primary key default 'singleton',
  content_html text,
  pdf_url text,
  updated_at timestamptz not null default now()
);

insert into public.tournament_rules (id) values ('singleton') on conflict do nothing;

-- =============================================
-- STANDINGS VIEW
-- =============================================
create or replace view public.standings_view as
  select
    p.id as user_id,
    p.team_name,
    p.manager_name,
    t.total_points
  from public.profiles p
  join public.user_teams t on t.user_id = p.id
  order by t.total_points desc;

-- =============================================
-- CALCULATE MATCHDAY RESULTS (RPC)
-- =============================================
create or replace function public.calculate_matchday_results(p_matchday_id uuid)
returns void as $$
declare
  v_rule record;
  v_stat record;
  v_points numeric;
  v_team record;
  v_player_points jsonb := '{}';
begin
  -- Calculate fantasy points for each player stat
  for v_stat in
    select * from public.player_match_stats where matchday_id = p_matchday_id
  loop
    v_points := 0;

    if v_stat.vote is not null then
      v_points := v_points + v_stat.vote;

      -- High vote bonuses
      if v_stat.vote >= 8 then v_points := v_points + 2;
      elsif v_stat.vote >= 7 then v_points := v_points + 1;
      elsif v_stat.vote <= 4 then v_points := v_points - 1;
      end if;
    end if;

    -- Apply rules from fantasy_rules table
    for v_rule in select * from public.fantasy_rules loop
      case v_rule.key
        when 'goal' then v_points := v_points + (v_stat.goals * v_rule.points);
        when 'assist' then v_points := v_points + (v_stat.assists * v_rule.points);
        when 'own_goal' then v_points := v_points + (v_stat.own_goals * abs(v_rule.points)) * -1;
        when 'yellow_card' then v_points := v_points + (v_stat.yellow_cards * abs(v_rule.points)) * -1;
        when 'red_card' then v_points := v_points + (v_stat.red_cards * abs(v_rule.points)) * -1;
        when 'penalty_scored' then v_points := v_points + (v_stat.penalty_scored * v_rule.points);
        when 'penalty_missed' then v_points := v_points + (v_stat.penalty_missed * abs(v_rule.points)) * -1;
        when 'penalty_saved' then v_points := v_points + (v_stat.penalty_saved * v_rule.points);
        else null;
      end case;
    end loop;

    -- Save fantasy points
    update public.player_match_stats
    set fantasy_points = v_points
    where id = v_stat.id;

    v_player_points := v_player_points || jsonb_build_object(v_stat.player_id::text, v_points);
  end loop;

  -- Calculate team points based on their lineup
  for v_team in select * from public.user_teams loop
    declare
      v_team_points numeric := 0;
      v_lineup_player jsonb;
      v_player_id text;
      v_fp numeric;
    begin
      for v_lineup_player in select * from jsonb_array_elements(v_team.lineup) loop
        v_player_id := v_lineup_player->>'player_id';
        if v_player_id is not null then
          v_fp := (v_player_points->>v_player_id)::numeric;
          if v_fp is not null then
            v_team_points := v_team_points + v_fp;
          end if;
        end if;
      end loop;

      update public.user_teams
      set
        total_points = total_points + v_team_points,
        matchday_points = matchday_points || jsonb_build_object(p_matchday_id::text, v_team_points)
      where id = v_team.id;
    end;
  end loop;

  -- Mark matchday as calculated
  update public.matchdays set status = 'calculated' where id = p_matchday_id;
end;
$$ language plpgsql security definer;

-- =============================================
-- RESET ALL STANDINGS (RPC)
-- =============================================
create or replace function public.reset_all_standings()
returns void as $$
begin
  update public.user_teams set total_points = 0, matchday_points = '{}';
  update public.matchdays set status = 'open' where status = 'calculated';
end;
$$ language plpgsql security definer;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Profiles
alter table public.profiles enable row level security;
create policy "Users can view all profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Players
alter table public.players enable row level security;
create policy "Anyone can view active players" on public.players for select using (is_active = true);
create policy "Admins can manage players" on public.players for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- User teams
alter table public.user_teams enable row level security;
create policy "Users can view all teams" on public.user_teams for select using (auth.uid() is not null);
create policy "Users can update own team" on public.user_teams for update using (auth.uid() = user_id);

-- Matchdays
alter table public.matchdays enable row level security;
create policy "Anyone authenticated can view matchdays" on public.matchdays for select using (auth.uid() is not null);
create policy "Admins can manage matchdays" on public.matchdays for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Player match stats
alter table public.player_match_stats enable row level security;
create policy "Anyone authenticated can view stats" on public.player_match_stats for select using (auth.uid() is not null);
create policy "Admins can manage stats" on public.player_match_stats for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- App settings
alter table public.app_settings enable row level security;
create policy "Anyone authenticated can view settings" on public.app_settings for select using (auth.uid() is not null);
create policy "Admins can update settings" on public.app_settings for update using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Fantasy rules
alter table public.fantasy_rules enable row level security;
create policy "Anyone authenticated can view rules" on public.fantasy_rules for select using (auth.uid() is not null);
create policy "Admins can manage rules" on public.fantasy_rules for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Tournament rules
alter table public.tournament_rules enable row level security;
create policy "Anyone authenticated can view tournament" on public.tournament_rules for select using (auth.uid() is not null);
create policy "Admins can manage tournament" on public.tournament_rules for update using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Special cards
alter table public.special_cards enable row level security;
create policy "Anyone authenticated can view cards" on public.special_cards for select using (auth.uid() is not null);
create policy "Admins can manage cards" on public.special_cards for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Sponsors
alter table public.sponsors enable row level security;
create policy "Anyone can view active sponsors" on public.sponsors for select using (is_active = true);
create policy "Admins can manage sponsors" on public.sponsors for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
