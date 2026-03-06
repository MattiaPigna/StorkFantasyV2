create table if not exists public.leagues (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid references auth.users on delete cascade not null,
  invite_code text unique not null default upper(substring(replace(uuid_generate_v4()::text, '-', ''), 1, 8)),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.league_members (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid references public.leagues on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  joined_at timestamptz not null default now(),
  unique(league_id, user_id)
);

alter table public.players add column if not exists league_id uuid references public.leagues on delete cascade;
alter table public.matchdays add column if not exists league_id uuid references public.leagues on delete cascade;
alter table public.user_teams add column if not exists league_id uuid references public.leagues on delete cascade;
alter table public.sponsors add column if not exists league_id uuid references public.leagues on delete cascade;
alter table public.fantasy_rules add column if not exists league_id uuid references public.leagues on delete cascade;
alter table public.special_cards add column if not exists league_id uuid references public.leagues on delete cascade;
alter table public.app_settings add column if not exists league_id uuid references public.leagues on delete cascade;
alter table public.tournament_rules add column if not exists league_id uuid references public.leagues on delete cascade;

alter table public.players drop constraint if exists players_name_key;
alter table public.fantasy_rules drop constraint if exists fantasy_rules_key_key;
alter table public.user_teams drop constraint if exists user_teams_user_id_key;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_teams_user_league_unique') then
    alter table public.user_teams add constraint user_teams_user_league_unique unique (user_id, league_id);
  end if;
end $$;

alter table public.leagues enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'leagues' and policyname = 'Anyone can view active leagues') then
    create policy "Anyone can view active leagues" on public.leagues for select using (is_active = true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'leagues' and policyname = 'Owners can manage their league') then
    create policy "Owners can manage their league" on public.leagues for all using (auth.uid() = owner_id);
  end if;
end $$;

alter table public.league_members enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'league_members' and policyname = 'Members can view league members') then
    create policy "Members can view league members" on public.league_members for select using (
      exists (select 1 from public.league_members lm where lm.league_id = league_members.league_id and lm.user_id = auth.uid())
      or exists (select 1 from public.leagues l where l.id = league_members.league_id and l.owner_id = auth.uid())
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'league_members' and policyname = 'Anyone can join a league') then
    create policy "Anyone can join a league" on public.league_members for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'league_members' and policyname = 'Members can leave') then
    create policy "Members can leave" on public.league_members for delete using (auth.uid() = user_id);
  end if;
end $$;

drop policy if exists "Anyone can view active players" on public.players;
drop policy if exists "Admins can manage players" on public.players;
create policy "League members can view players" on public.players for select using (
  league_id is null or
  exists (select 1 from public.league_members where league_id = players.league_id and user_id = auth.uid())
);
create policy "League owners can manage players" on public.players for all using (
  exists (select 1 from public.leagues where id = players.league_id and owner_id = auth.uid())
);

drop policy if exists "Anyone authenticated can view matchdays" on public.matchdays;
drop policy if exists "Admins can manage matchdays" on public.matchdays;
create policy "League members can view matchdays" on public.matchdays for select using (
  league_id is null or
  exists (select 1 from public.league_members where league_id = matchdays.league_id and user_id = auth.uid())
);
create policy "League owners can manage matchdays" on public.matchdays for all using (
  exists (select 1 from public.leagues where id = matchdays.league_id and owner_id = auth.uid())
);

drop policy if exists "Users can view all teams" on public.user_teams;
drop policy if exists "Users can update own team" on public.user_teams;
create policy "League members can view teams" on public.user_teams for select using (
  league_id is null or
  exists (select 1 from public.league_members where league_id = user_teams.league_id and user_id = auth.uid())
);
create policy "Users can manage own team" on public.user_teams for all using (auth.uid() = user_id);

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

drop policy if exists "Anyone authenticated can view settings" on public.app_settings;
drop policy if exists "Admins can update settings" on public.app_settings;
create policy "League members can view settings" on public.app_settings for select using (
  league_id is null or
  exists (select 1 from public.league_members where league_id = app_settings.league_id and user_id = auth.uid())
);
create policy "League owners can manage settings" on public.app_settings for all using (
  exists (select 1 from public.leagues where id = app_settings.league_id and owner_id = auth.uid())
);

drop policy if exists "Anyone authenticated can view rules" on public.fantasy_rules;
drop policy if exists "Admins can manage rules" on public.fantasy_rules;
create policy "League members can view rules" on public.fantasy_rules for select using (
  league_id is null or
  exists (select 1 from public.league_members where league_id = fantasy_rules.league_id and user_id = auth.uid())
);
create policy "League owners can manage rules" on public.fantasy_rules for all using (
  exists (select 1 from public.leagues where id = fantasy_rules.league_id and owner_id = auth.uid())
);

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

drop policy if exists "Anyone authenticated can view cards" on public.special_cards;
drop policy if exists "Admins can manage cards" on public.special_cards;
create policy "League members can view cards" on public.special_cards for select using (
  league_id is null or
  exists (select 1 from public.league_members where league_id = special_cards.league_id and user_id = auth.uid())
);
create policy "League owners can manage cards" on public.special_cards for all using (
  exists (select 1 from public.leagues where id = special_cards.league_id and owner_id = auth.uid())
);

drop policy if exists "Anyone authenticated can view tournament" on public.tournament_rules;
drop policy if exists "Admins can manage tournament" on public.tournament_rules;
create policy "League members can view tournament" on public.tournament_rules for select using (
  league_id is null or
  exists (select 1 from public.league_members where league_id = tournament_rules.league_id and user_id = auth.uid())
);
create policy "League owners can manage tournament" on public.tournament_rules for all using (
  exists (select 1 from public.leagues where id = tournament_rules.league_id and owner_id = auth.uid())
);

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

create or replace function public.reset_league_standings(p_league_id uuid)
returns void as $$
begin
  update public.user_teams set total_points = 0, matchday_points = '{}' where league_id = p_league_id;
  update public.matchdays set status = 'open' where status = 'calculated' and league_id = p_league_id;
end;
$$ language plpgsql security definer;

create or replace function public.handle_new_league()
returns trigger as $$
begin
  insert into public.league_members (league_id, user_id)
  values (new.id, new.owner_id);

  insert into public.app_settings (id, league_id, market_open, lineup_locked, max_players_per_team, lineup_size, initial_credits, updated_at)
  values (uuid_generate_v4(), new.id, true, false, 15, 11, 250, now())
  on conflict do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_league_created on public.leagues;
create trigger on_league_created
  after insert on public.leagues
  for each row execute procedure public.handle_new_league();

create or replace function public.handle_new_league_member()
returns trigger as $$
declare
  v_initial_credits integer;
begin
  select coalesce(initial_credits, 250) into v_initial_credits
  from public.app_settings
  where league_id = new.league_id
  limit 1;

  insert into public.user_teams (user_id, league_id, players, lineup, credits, total_points, matchday_points)
  values (new.user_id, new.league_id, '{}', '[]', v_initial_credits, 0, '{}')
  on conflict (user_id, league_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_league_member_added on public.league_members;
create trigger on_league_member_added
  after insert on public.league_members
  for each row execute procedure public.handle_new_league_member();
