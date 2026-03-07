"use client";

import { useEffect, useState } from "react";
import {
  Swords, Clock, Trophy, Target, Zap, TrendingUp, ChevronDown,
  Users, ShieldCheck, X, Star, Minus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDailyMatches, type DailyMatch } from "@/lib/db/matches";
import { getTopScorers, getPlayers, type TopScorer } from "@/lib/db/players";
import { getTournamentTeams, type TournamentTeam } from "@/lib/db/tournament-teams";
import { getPlayerAllStats } from "@/lib/db/matchdays";
import { useLeagueStore } from "@/store/league";
import { PLAYER_ROLE_LABELS, PLAYER_ROLE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Player, PlayerMatchStats } from "@/types";

type Tab = "calendario" | "classifica";

interface TeamStanding {
  team: string;
  logo_url: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  gs: number;
  diff: number;
  points: number;
}

function computeStandings(matches: DailyMatch[], teams: TournamentTeam[]): TeamStanding[] {
  const map = new Map<string, TeamStanding>();
  for (const t of teams) {
    map.set(t.name, { team: t.name, logo_url: t.logo_url ?? null, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, gs: 0, diff: 0, points: 0 });
  }
  function get(name: string): TeamStanding {
    if (!map.has(name)) map.set(name, { team: name, logo_url: null, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, gs: 0, diff: 0, points: 0 });
    return map.get(name)!;
  }
  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue;
    const home = get(m.home_team);
    const away = get(m.away_team);
    home.played++; away.played++;
    home.gf += m.home_score; home.gs += m.away_score;
    away.gf += m.away_score; away.gs += m.home_score;
    if (m.home_score > m.away_score) { home.wins++; home.points += 3; away.losses++; }
    else if (m.home_score < m.away_score) { away.wins++; away.points += 3; home.losses++; }
    else { home.draws++; home.points++; away.draws++; away.points++; }
  }
  return Array.from(map.values())
    .map((t) => ({ ...t, diff: t.gf - t.gs }))
    .sort((a, b) => b.points - a.points || b.diff - a.diff || b.gf - a.gf);
}

function groupByDate(matches: DailyMatch[]): { label: string; isToday: boolean; matches: DailyMatch[] }[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const map = new Map<string, { label: string; isToday: boolean; ts: number; matches: DailyMatch[] }>();
  for (const m of matches) {
    const d = new Date(m.match_datetime); d.setHours(0, 0, 0, 0);
    const key = d.toISOString();
    const isToday = d.getTime() === today.getTime();
    const label = isToday ? "Oggi" : d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
    if (!map.has(key)) map.set(key, { label, isToday, ts: d.getTime(), matches: [] });
    map.get(key)!.matches.push(m);
  }
  return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
}

// ── Team players modal ──
function TeamModal({ team, allPlayers, onClose }: { team: TeamStanding; allPlayers: Player[]; onClose: () => void }) {
  const players = allPlayers.filter((p) => p.team === team.team).sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
  const gk = players.filter((p) => p.role === "P");
  const out = players.filter((p) => p.role !== "P");

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-stork-dark-card border border-stork-dark-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stork-dark-border shrink-0">
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.team} className="w-10 h-10 object-contain rounded-lg" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-stork-orange/15 border border-stork-orange/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-stork-orange" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-black text-base truncate">{team.team}</p>
            <p className="text-xs text-muted-foreground">{players.length} giocatori · {team.points} pt</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-stork-dark transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {players.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nessun giocatore trovato</p>
            </div>
          ) : (
            <>
              {gk.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Portieri</p>
                  <div className="space-y-1">
                    {gk.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-stork-dark border border-stork-dark-border">
                        <Badge className={cn("text-[10px] px-1.5 py-0 shrink-0", PLAYER_ROLE_COLORS[p.role])} variant="outline">{PLAYER_ROLE_LABELS[p.role]}</Badge>
                        <span className="text-sm font-medium flex-1">{p.name}</span>
                        <span className="text-xs text-yellow-400 font-semibold">{p.price} SK</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {out.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Movimento</p>
                  <div className="space-y-1">
                    {out.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-stork-dark border border-stork-dark-border">
                        <Badge className={cn("text-[10px] px-1.5 py-0 shrink-0", PLAYER_ROLE_COLORS[p.role])} variant="outline">{PLAYER_ROLE_LABELS[p.role]}</Badge>
                        <span className="text-sm font-medium flex-1">{p.name}</span>
                        <span className="text-xs text-yellow-400 font-semibold">{p.price} SK</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Player profile modal ──
function PlayerModal({ player, onClose }: { player: TopScorer; onClose: () => void }) {
  const [stats, setStats] = useState<(PlayerMatchStats & { matchday_name: string; matchday_number: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getPlayerAllStats(player.player_id)
      .then(setStats)
      .finally(() => setIsLoading(false));
  }, [player.player_id]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-stork-dark-card border border-stork-dark-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stork-dark-border shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stork-orange/20 to-stork-gold/10 border border-stork-orange/20 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-stork-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-base truncate">{player.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={cn("text-[10px] px-1.5 py-0", PLAYER_ROLE_COLORS[player.role as "P" | "M"])} variant="outline">
                {PLAYER_ROLE_LABELS[player.role as "P" | "M"] ?? player.role}
              </Badge>
              <span className="text-xs text-muted-foreground">{player.team}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-stork-dark transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Totali */}
        <div className="grid grid-cols-4 gap-px bg-stork-dark-border shrink-0">
          {[
            { label: "Gol", value: player.total_goals, color: "text-stork-gold" },
            { label: "Assist", value: player.total_assists, color: "text-blue-400" },
            { label: "Punti", value: player.total_points.toFixed(1), color: "text-stork-orange" },
            { label: "Giornate", value: player.matchdays_played, color: "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-stork-dark-card px-3 py-3 text-center">
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Stats per giornata */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Nessuna statistica disponibile</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-stork-dark-card">
                <tr className="border-b border-stork-dark-border">
                  <th className="text-left py-2.5 px-4 text-xs text-muted-foreground font-semibold">Giornata</th>
                  <th className="text-center py-2.5 px-2 text-xs text-muted-foreground font-semibold">Voto</th>
                  <th className="text-center py-2.5 px-2 text-xs text-stork-gold font-semibold">Gol</th>
                  <th className="text-center py-2.5 px-2 text-xs text-blue-400 font-semibold">Ass</th>
                  <th className="text-center py-2.5 px-2 text-xs text-muted-foreground font-semibold">Gio</th>
                  <th className="text-center py-2.5 px-2 text-xs text-muted-foreground font-semibold">Esp</th>
                  <th className="text-center py-2.5 px-2 text-xs text-stork-orange font-semibold">Pt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stork-dark-border">
                {stats.map((s) => (
                  <tr key={s.matchday_id} className="hover:bg-stork-dark/40 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-xs">{s.matchday_name}</td>
                    <td className="py-2.5 px-2 text-center text-xs">{s.vote ?? <Minus className="w-3 h-3 mx-auto text-muted-foreground/40" />}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-stork-gold">{s.goals > 0 ? s.goals : <span className="text-muted-foreground/40">—</span>}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-blue-400">{s.assists > 0 ? s.assists : <span className="text-muted-foreground/40">—</span>}</td>
                    <td className="py-2.5 px-2 text-center text-xs">{s.yellow_cards > 0 ? <span className="text-yellow-400">{s.yellow_cards}</span> : <span className="text-muted-foreground/40">—</span>}</td>
                    <td className="py-2.5 px-2 text-center text-xs">{s.red_cards > 0 ? <span className="text-red-400">{s.red_cards}</span> : <span className="text-muted-foreground/40">—</span>}</td>
                    <td className="py-2.5 px-2 text-center font-black text-stork-orange">{s.fantasy_points?.toFixed(1) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export function FixturesView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [tab, setTab] = useState<Tab>("calendario");
  const [matches, setMatches] = useState<DailyMatch[]>([]);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [topScorers, setTopScorers] = useState<TopScorer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scorersLimit, setScorersLimit] = useState(10);
  const [selectedTeam, setSelectedTeam] = useState<TeamStanding | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<TopScorer | null>(null);

  useEffect(() => {
    if (!leagueId) return;
    Promise.allSettled([
      getDailyMatches(leagueId),
      getTournamentTeams(leagueId),
      getTopScorers(leagueId),
      getPlayers(leagueId),
    ]).then(([mRes, tRes, scRes, plRes]) => {
      if (mRes.status === "fulfilled") setMatches(mRes.value);
      if (tRes.status === "fulfilled") setTeams(tRes.value);
      if (scRes.status === "fulfilled") setTopScorers(scRes.value.filter((s) => s.total_goals > 0 || s.total_assists > 0));
      if (plRes.status === "fulfilled") setAllPlayers(plRes.value);
    }).finally(() => setIsLoading(false));
  }, [leagueId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const grouped = groupByDate(matches);
  const standings = computeStandings(matches, teams);
  const topGoals = [...topScorers].sort((a, b) => b.total_goals - a.total_goals).filter((s) => s.total_goals > 0);
  const topAssists = [...topScorers].sort((a, b) => b.total_assists - a.total_assists).filter((s) => s.total_assists > 0);

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-stork-orange" />
        <h1 className="text-2xl font-bold">Torneo</h1>
      </div>

      {/* ── SQUADRE PARTECIPANTI (sempre visibili) ── */}
      {teams.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Squadre partecipanti
          </p>
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => {
                  const standing = standings.find((s) => s.team === team.name) ?? {
                    team: team.name, logo_url: team.logo_url ?? null,
                    played: 0, wins: 0, draws: 0, losses: 0, gf: 0, gs: 0, diff: 0, points: 0,
                  };
                  setSelectedTeam(standing);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stork-dark border border-stork-dark-border hover:border-stork-orange/40 hover:bg-stork-orange/5 transition-all"
              >
                {team.logo_url ? (
                  <img src={team.logo_url} alt={team.name} className="w-6 h-6 object-contain rounded" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-muted-foreground/50" />
                )}
                <span className="text-sm font-semibold">{team.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-stork-dark rounded-xl border border-stork-dark-border">
        {([
          { key: "calendario", label: "Calendario", icon: Clock },
          { key: "classifica", label: "Classifica", icon: Trophy },
        ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
              tab === key
                ? "bg-gradient-to-r from-stork-orange to-stork-gold-dark text-black shadow-glow-orange"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: CALENDARIO ── */}
      {tab === "calendario" && (
        <div className="space-y-5">
          {grouped.length === 0 ? (
            <Card className="border-stork-dark-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nessuna partita in programma</p>
              </CardContent>
            </Card>
          ) : grouped.map(({ label, isToday, matches: dayMatches }) => (
            <div key={label}>
              <div className="flex items-center gap-2 mb-2">
                <p className={`text-xs font-bold uppercase tracking-widest capitalize ${isToday ? "text-stork-orange" : "text-muted-foreground"}`}>{label}</p>
                {isToday && <Badge className="text-[10px] px-1.5 py-0 bg-stork-orange/20 text-stork-orange border-stork-orange/30">Oggi</Badge>}
              </div>
              <div className="space-y-2">
                {dayMatches.map((match) => {
                  const time = new Date(match.match_datetime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
                  const hasResult = match.home_score !== null && match.away_score !== null;
                  const homeTeamData = teams.find((t) => t.name === match.home_team);
                  const awayTeamData = teams.find((t) => t.name === match.away_team);
                  return (
                    <Card key={match.id} className={`border-stork-dark-border ${isToday ? "border-stork-orange/20" : ""}`}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="flex flex-col items-center min-w-[52px]">
                          <span className={`text-sm font-black ${isToday ? "text-stork-orange" : "text-foreground"}`}>{time}</span>
                          <span className="text-[10px] text-muted-foreground text-center">{match.competition}</span>
                        </div>
                        <div className="w-px h-8 bg-stork-dark-border" />
                        <div className="flex-1 flex items-center justify-between gap-2">
                          <div className={`flex items-center gap-2 flex-1 justify-end ${hasResult && match.home_score! > match.away_score! ? "text-emerald-400" : ""}`}>
                            <span className="font-semibold text-sm text-right">{match.home_team}</span>
                            {homeTeamData?.logo_url && <img src={homeTeamData.logo_url} alt="" className="w-6 h-6 object-contain shrink-0" />}
                          </div>
                          {hasResult ? (
                            <span className="text-lg font-black text-foreground px-2 shrink-0">{match.home_score} – {match.away_score}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground font-bold px-2 shrink-0">VS</span>
                          )}
                          <div className={`flex items-center gap-2 flex-1 ${hasResult && match.away_score! > match.home_score! ? "text-emerald-400" : ""}`}>
                            {awayTeamData?.logo_url && <img src={awayTeamData.logo_url} alt="" className="w-6 h-6 object-contain shrink-0" />}
                            <span className="font-semibold text-sm">{match.away_team}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: CLASSIFICA ── */}
      {tab === "classifica" && (
        <div className="space-y-6">
          {/* Standings table */}
          {standings.length === 0 ? (
            <Card className="border-stork-dark-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Trophy className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nessun dato disponibile</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-stork-dark-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stork-dark-border bg-stork-dark/50">
                        <th className="text-left py-3 px-3 text-xs text-muted-foreground font-semibold w-8">#</th>
                        <th className="text-left py-3 px-3 text-xs text-muted-foreground font-semibold">Squadra</th>
                        <th className="text-center py-3 px-2 text-xs text-muted-foreground font-semibold">G</th>
                        <th className="text-center py-3 px-2 text-xs text-emerald-400 font-semibold">V</th>
                        <th className="text-center py-3 px-2 text-xs text-yellow-400 font-semibold">P</th>
                        <th className="text-center py-3 px-2 text-xs text-red-400 font-semibold">S</th>
                        <th className="text-center py-3 px-2 text-xs text-muted-foreground font-semibold">GF</th>
                        <th className="text-center py-3 px-2 text-xs text-muted-foreground font-semibold">GS</th>
                        <th className="text-center py-3 px-2 text-xs text-muted-foreground font-semibold">DR</th>
                        <th className="text-center py-3 px-3 text-xs text-stork-orange font-semibold">Pt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stork-dark-border">
                      {standings.map((team, i) => (
                        <tr
                          key={team.team}
                          className="hover:bg-stork-dark/60 transition-colors cursor-pointer"
                          onClick={() => setSelectedTeam(team)}
                        >
                          <td className="py-2.5 px-3 text-muted-foreground font-bold text-xs">{i + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              {team.logo_url
                                ? <img src={team.logo_url} alt={team.team} className="w-6 h-6 object-contain rounded shrink-0" />
                                : <ShieldCheck className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                              }
                              <span className="font-semibold">{team.team}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center text-muted-foreground text-xs">{team.played}</td>
                          <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">{team.wins}</td>
                          <td className="py-2.5 px-2 text-center text-yellow-400 font-bold">{team.draws}</td>
                          <td className="py-2.5 px-2 text-center text-red-400 font-bold">{team.losses}</td>
                          <td className="py-2.5 px-2 text-center text-xs">{team.gf}</td>
                          <td className="py-2.5 px-2 text-center text-xs">{team.gs}</td>
                          <td className="py-2.5 px-2 text-center text-xs">
                            <span className={team.diff > 0 ? "text-emerald-400" : team.diff < 0 ? "text-red-400" : "text-muted-foreground"}>
                              {team.diff > 0 ? `+${team.diff}` : team.diff}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-stork-orange">{team.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              <p className="text-[11px] text-muted-foreground px-1">Tocca una squadra per vedere i giocatori in rosa</p>
            </>
          )}

          {/* Marcatori */}
          {topGoals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Target className="w-3.5 h-3.5" /> Marcatori
              </h2>
              <Card className="border-stork-dark-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stork-dark-border bg-stork-dark/50">
                        <th className="text-left py-3 px-3 text-xs text-muted-foreground font-semibold w-8">#</th>
                        <th className="text-left py-3 px-3 text-xs text-muted-foreground font-semibold">Giocatore</th>
                        <th className="text-left py-3 px-3 text-xs text-muted-foreground font-semibold hidden sm:table-cell">Squadra</th>
                        <th className="text-center py-3 px-3 text-xs text-stork-gold font-semibold">Gol</th>
                        <th className="text-center py-3 px-3 text-xs text-blue-400 font-semibold">Ass</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stork-dark-border">
                      {topGoals.slice(0, scorersLimit).map((player, i) => (
                        <tr key={player.player_id} className="hover:bg-stork-dark/60 transition-colors cursor-pointer" onClick={() => setSelectedPlayer(player)}>
                          <td className="py-2.5 px-3">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-muted-foreground text-xs font-bold">{i + 1}</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-semibold">{player.name}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{player.team}</p>
                            <p className="text-[11px] text-muted-foreground/60">{PLAYER_ROLE_LABELS[player.role as "P" | "M"] ?? player.role}</p>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground text-sm hidden sm:table-cell">{player.team}</td>
                          <td className="py-2.5 px-3 text-center font-black text-stork-gold">{player.total_goals}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-blue-400">{player.total_assists}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {topGoals.length > scorersLimit && (
                  <button onClick={() => setScorersLimit((p) => p + 10)} className="w-full py-3 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 border-t border-stork-dark-border hover:bg-stork-dark/40 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" /> Mostra altri
                  </button>
                )}
              </Card>
            </div>
          )}

          {/* Assist */}
          {topAssists.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> Assist
              </h2>
              <Card className="border-stork-dark-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stork-dark-border bg-stork-dark/50">
                        <th className="text-left py-3 px-3 text-xs text-muted-foreground font-semibold w-8">#</th>
                        <th className="text-left py-3 px-3 text-xs text-muted-foreground font-semibold">Giocatore</th>
                        <th className="text-left py-3 px-3 text-xs text-muted-foreground font-semibold hidden sm:table-cell">Squadra</th>
                        <th className="text-center py-3 px-3 text-xs text-blue-400 font-semibold">Assist</th>
                        <th className="text-center py-3 px-3 text-xs text-stork-gold font-semibold">Gol</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stork-dark-border">
                      {topAssists.slice(0, 10).map((player, i) => (
                        <tr key={player.player_id} className="hover:bg-stork-dark/60 transition-colors cursor-pointer" onClick={() => setSelectedPlayer(player)}>
                          <td className="py-2.5 px-3 text-muted-foreground text-xs font-bold">{i + 1}</td>
                          <td className="py-2.5 px-3">
                            <p className="font-semibold">{player.name}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{player.team}</p>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground text-sm hidden sm:table-cell">{player.team}</td>
                          <td className="py-2.5 px-3 text-center font-black text-blue-400">{player.total_assists}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-stork-gold">{player.total_goals}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {standings.length === 0 && topGoals.length === 0 && (
            <Card className="border-stork-dark-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nessun dato disponibile</p>
                <p className="text-xs mt-1">Appariranno dopo le prime partite calcolate</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedTeam && <TeamModal team={selectedTeam} allPlayers={allPlayers} onClose={() => setSelectedTeam(null)} />}
      {selectedPlayer && <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </div>
  );
}
