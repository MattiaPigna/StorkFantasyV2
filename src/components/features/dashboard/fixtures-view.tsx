"use client";

import { useEffect, useState } from "react";
import { Swords, Clock, Trophy, Target, Zap, TrendingUp, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDailyMatches, type DailyMatch } from "@/lib/db/matches";
import { getTopScorers, type TopScorer } from "@/lib/db/players";
import { useLeagueStore } from "@/store/league";
import { PLAYER_ROLE_LABELS } from "@/lib/constants";

interface TeamStanding {
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  gs: number;
  diff: number;
  points: number;
}

function computeStandings(matches: DailyMatch[]): TeamStanding[] {
  const map = new Map<string, TeamStanding>();

  function get(team: string): TeamStanding {
    if (!map.has(team)) map.set(team, { team, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, gs: 0, diff: 0, points: 0 });
    return map.get(team)!;
  }

  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue;
    const home = get(m.home_team);
    const away = get(m.away_team);
    home.played++; away.played++;
    home.gf += m.home_score; home.gs += m.away_score;
    away.gf += m.away_score; away.gs += m.home_score;
    if (m.home_score > m.away_score) {
      home.wins++; home.points += 3;
      away.losses++;
    } else if (m.home_score < m.away_score) {
      away.wins++; away.points += 3;
      home.losses++;
    } else {
      home.draws++; home.points++;
      away.draws++; away.points++;
    }
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

export function FixturesView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [matches, setMatches] = useState<DailyMatch[]>([]);
  const [topScorers, setTopScorers] = useState<TopScorer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scorersLimit, setScorersLimit] = useState(10);

  useEffect(() => {
    if (!leagueId) return;
    Promise.all([getDailyMatches(leagueId), getTopScorers(leagueId)])
      .then(([m, sc]) => {
        setMatches(m);
        setTopScorers(sc.filter((s) => s.total_goals > 0 || s.total_assists > 0).sort((a, b) => b.total_goals - a.total_goals));
      })
      .finally(() => setIsLoading(false));
  }, [leagueId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const grouped = groupByDate(matches);
  const standings = computeStandings(matches);
  const topGoals = [...topScorers].sort((a, b) => b.total_goals - a.total_goals).filter((s) => s.total_goals > 0);
  const topAssists = [...topScorers].sort((a, b) => b.total_assists - a.total_assists).filter((s) => s.total_assists > 0);

  return (
    <div className="p-4 lg:p-8 space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <Swords className="w-6 h-6 text-stork-orange" />
        <h1 className="text-2xl font-bold">Partite & Statistiche</h1>
      </div>

      {/* ── CALENDARIO ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" /> Calendario
        </h2>
        {grouped.length === 0 ? (
          <Card className="border-stork-dark-border">
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              Nessuna partita in programma
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {grouped.map(({ label, isToday, matches: dayMatches }) => (
              <div key={label}>
                <div className="flex items-center gap-2 mb-2">
                  <p className={`text-xs font-bold uppercase tracking-widest capitalize ${isToday ? "text-stork-orange" : "text-muted-foreground"}`}>
                    {label}
                  </p>
                  {isToday && <Badge className="text-[10px] px-1.5 py-0 bg-stork-orange/20 text-stork-orange border-stork-orange/30">Oggi</Badge>}
                </div>
                <div className="space-y-2">
                  {dayMatches.map((match) => {
                    const time = new Date(match.match_datetime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
                    const hasResult = match.home_score !== null && match.away_score !== null;
                    return (
                      <Card key={match.id} className={`border-stork-dark-border ${isToday ? "border-stork-orange/20" : ""}`}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="flex flex-col items-center min-w-[52px]">
                            <span className={`text-sm font-black ${isToday ? "text-stork-orange" : "text-foreground"}`}>{time}</span>
                            <span className="text-[10px] text-muted-foreground text-center">{match.competition}</span>
                          </div>
                          <div className="w-px h-8 bg-stork-dark-border" />
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <span className={`font-semibold text-sm flex-1 text-right ${hasResult && match.home_score! > match.away_score! ? "text-emerald-400" : ""}`}>
                              {match.home_team}
                            </span>
                            {hasResult ? (
                              <span className="text-lg font-black text-foreground px-2 shrink-0">
                                {match.home_score} – {match.away_score}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground font-bold px-2 shrink-0">VS</span>
                            )}
                            <span className={`font-semibold text-sm flex-1 ${hasResult && match.away_score! > match.home_score! ? "text-emerald-400" : ""}`}>
                              {match.away_team}
                            </span>
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
      </section>

      {/* ── CLASSIFICA ── */}
      {standings.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5" /> Classifica
          </h2>
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
                    <tr key={team.team} className="hover:bg-stork-dark/40 transition-colors">
                      <td className="py-2.5 px-3 text-muted-foreground font-bold text-xs">{i + 1}</td>
                      <td className="py-2.5 px-3 font-semibold">{team.team}</td>
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
          <p className="text-[11px] text-muted-foreground px-1">G=Giocate · V=Vinte · P=Pareggiate · S=Perse · GF=Gol Fatti · GS=Gol Subiti · DR=Diff Reti · Pt=Punti</p>
        </section>
      )}

      {/* ── MARCATORI ── */}
      {topGoals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Target className="w-3.5 h-3.5" /> Classifica Marcatori
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
                    <tr key={player.player_id} className="hover:bg-stork-dark/40 transition-colors">
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
              <button
                onClick={() => setScorersLimit((p) => p + 10)}
                className="w-full py-3 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 border-t border-stork-dark-border hover:bg-stork-dark/40 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" /> Mostra altri
              </button>
            )}
          </Card>
        </section>
      )}

      {/* ── ASSIST ── */}
      {topAssists.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> Classifica Assist
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
                    <tr key={player.player_id} className="hover:bg-stork-dark/40 transition-colors">
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
        </section>
      )}

      {matches.length === 0 && topGoals.length === 0 && (
        <Card className="border-stork-dark-border">
          <CardContent className="py-16 text-center text-muted-foreground">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Nessun dato disponibile</p>
            <p className="text-xs mt-1">Le statistiche appariranno dopo la prima giornata calcolata</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
