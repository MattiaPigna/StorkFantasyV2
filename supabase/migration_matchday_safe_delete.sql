-- =============================================
-- MIGRATION: Safe matchday delete + recalculation
-- Eseguire nel SQL Editor di Supabase
-- =============================================

-- 1. Safe delete: rimuove i punti dagli utenti prima di eliminare la giornata
create or replace function public.delete_matchday_safe(p_matchday_id uuid)
returns void as $$
declare
  v_matchday record;
  v_team record;
  v_old_points numeric;
begin
  select * into v_matchday from public.matchdays where id = p_matchday_id;
  if not found then
    raise exception 'Giornata non trovata';
  end if;

  -- Se la giornata era già calcolata, rimuovi i punti da tutti i team della lega
  if v_matchday.status = 'calculated' then
    for v_team in
      select * from public.user_teams
      where league_id IS NOT DISTINCT FROM v_matchday.league_id
    loop
      v_old_points := coalesce((v_team.matchday_points->>p_matchday_id::text)::numeric, 0);
      update public.user_teams
      set
        total_points = total_points - v_old_points,
        matchday_points = matchday_points - p_matchday_id::text
      where id = v_team.id;
    end loop;
  end if;

  -- Elimina stats e giornata
  delete from public.player_match_stats where matchday_id = p_matchday_id;
  delete from public.matchdays where id = p_matchday_id;
end;
$$ language plpgsql security definer;

-- 2. Aggiorna calculate_matchday_results: se già calcolata, annulla prima i vecchi punti
create or replace function public.calculate_matchday_results(p_matchday_id uuid)
returns void as $$
declare
  v_matchday record;
  v_rule record;
  v_stat record;
  v_points numeric;
  v_team record;
  v_player_points jsonb := '{}';
begin
  select * into v_matchday from public.matchdays where id = p_matchday_id;

  -- Se già calcolata, annulla i punti precedenti
  if v_matchday.status = 'calculated' then
    for v_team in
      select * from public.user_teams
      where league_id IS NOT DISTINCT FROM v_matchday.league_id
    loop
      declare
        v_old_points numeric;
      begin
        v_old_points := coalesce((v_team.matchday_points->>p_matchday_id::text)::numeric, 0);
        update public.user_teams
        set
          total_points = total_points - v_old_points,
          matchday_points = matchday_points - p_matchday_id::text
        where id = v_team.id;
      end;
    end loop;
  end if;

  -- Calcola i fantasy points per ogni stat giocatore
  for v_stat in
    select * from public.player_match_stats where matchday_id = p_matchday_id
  loop
    v_points := 0;

    if v_stat.vote is not null then
      v_points := v_points + v_stat.vote;
      if v_stat.vote >= 8 then v_points := v_points + 2;
      elsif v_stat.vote >= 7 then v_points := v_points + 1;
      elsif v_stat.vote <= 4 then v_points := v_points - 1;
      end if;
    end if;

    -- Applica le regole dalla tabella fantasy_rules
    for v_rule in
      select * from public.fantasy_rules where league_id = v_matchday.league_id
    loop
      case v_rule.key
        when 'goal'           then v_points := v_points + (v_stat.goals * v_rule.points);
        when 'assist'         then v_points := v_points + (v_stat.assists * v_rule.points);
        when 'own_goal'       then v_points := v_points - (v_stat.own_goals * abs(v_rule.points));
        when 'yellow_card'    then v_points := v_points - (v_stat.yellow_cards * abs(v_rule.points));
        when 'red_card'       then v_points := v_points - (v_stat.red_cards * abs(v_rule.points));
        when 'penalty_scored' then v_points := v_points + (v_stat.penalty_scored * v_rule.points);
        when 'penalty_missed' then v_points := v_points - (v_stat.penalty_missed * abs(v_rule.points));
        when 'penalty_saved'  then v_points := v_points + (v_stat.penalty_saved * v_rule.points);
        else null;
      end case;
    end loop;

    -- Bonus/malus manuali
    v_points := v_points + v_stat.bonus_points - v_stat.malus_points;

    update public.player_match_stats
    set fantasy_points = v_points
    where player_id = v_stat.player_id and matchday_id = p_matchday_id;

    v_player_points := v_player_points || jsonb_build_object(v_stat.player_id::text, v_points);
  end loop;

  -- Calcola i punti di ogni team in base alla loro formazione
  for v_team in
    select * from public.user_teams
    where league_id IS NOT DISTINCT FROM v_matchday.league_id
  loop
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

  -- Segna la giornata come calcolata
  update public.matchdays set status = 'calculated' where id = p_matchday_id;
end;
$$ language plpgsql security definer;
