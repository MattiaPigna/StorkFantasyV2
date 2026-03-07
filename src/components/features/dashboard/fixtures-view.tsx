"use client";

import { useEffect, useState } from "react";
import { Swords, Clock, Trophy, Target, Zap, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDailyMatches, type DailyMatch } from "@/lib/db/matches";
import { getTeamStats, getTopScorers, type TeamStat, type TopScorer } from "@/lib/db/players";
import { useLeagueStore } from "@/store/league";
import { PLAYER_ROLE_LABELS } from "@/lib/constants";

function groupByDate(matches: DailyMatch[]): { label: string; isToday: boolean; matches: DailyMatch[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const map = new Map<string, { label: string; isToday: boolean; ts: number; matches: DailyMatch[] }>();

  for (const m of matches) {
    const d = new Date(m.match_datetime);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString();
    const isToday = d.getTime() === today.getTime();
    const label = isToday
      ? "Oggi"
      : d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

    if (!map.has(key)) map.set(key, { label, isToday, ts: d.getTime(), matches: [] });
    map.get(key)!.matches.push(m);
  }

  return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
}

export function FixturesView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [matches, setMatches] = useState<DailyMatch[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);
  const [topScorers, setTopScorers] = useState<TopScorer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [scorersLimit, setScorersLimit] = useState(10);

  useEffect(() => {
    if (!leagueId) return;
    Promise.all([getDailyMatches(leagueId), getTeamStats(leagueId), getTopScorers(leagueId)])
      .then(([m, ts, sc]) => {
        setMatches(m);
        setTeamStats(ts);
        setTopScorers(sc.filter((s) => s.total_goals > 0).sort((a, b) => b.total_goals - a.total_goals));
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

  return (
    <div className="p-4 lg:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Swords className="w-6 h-6 text-stork-orange" />
        <h1 className="text-2xl font-bold">Partite & Statistiche</h1>
      </div>

      {/* ── PARTITE IN PROGRAMMA ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Clock className="w-4 h-4" /> Calendario Partite
        </h2>

        {grouped.length === 0 ? (
          <Card className="border-stork-dark-border">
            <CardContent className="py-10 text-center text-muted-foreground">
              <Swords className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nessuna partita in programma</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
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
                    return (
                      <Card key={match.id} className={`border-stork-dark-border ${isToday ? "border-stork-orange/20 bg-stork-orange/3" : ""}`}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="flex flex-col items-center min-w-[52px]">
                            <span className={`text-sm font-black ${isToday ? "text-stork-orange" : "text-foreground"}`}>{time}</span>
                            <span className="text-[10px] text-muted-foreground text-center leading-tight mt-0.5">{match.competition}</span>
                          </div>
                          <div className="w-px h-8 bg-stork-dark-border" />
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm flex-1 text-right">{match.home_team}</span>
                            <span className="text-xs text-muted-foreground font-bold px-2">VS</span>
                            <span className="font-semibold text-sm flex-1">{match.away_team}</span>
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

      {/* ── CLASSIFICA SQUADRE REALI ── */}
      {teamStats.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Classifica Squadre
          </h2>
          <Card className="border-stork-dark-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stork-dark-border bg-stork-dark/50">
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider w-8">#</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Squadra</th>
                    <th className="text-center py-3 px-3 text-xs text-emerald-400 font-semibold uppercase tracking-wider">GF</th>
                    <th className="text-center py-3 px-3 text-xs text-red-400 font-semibold uppercase tracking-wider">GS</th>
                    <th className="text-center py-3 px-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Diff</th>
                    <th className="text-left py-3 px-4 text-xs text-stork-gold font-semibold uppercase tracking-wider hidden sm:table-cell">Marcatori</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stork-dark-border">
                  {teamStats.map((team, i) => {
                    const isExpanded = expandedTeam === team.team;
                    return (
                      <>
                        <tr
                          key={team.team}
                          className="hover:bg-stork-dark/40 cursor-pointer transition-colors"
                          onClick={() => setExpandedTeam(isExpanded ? null : team.team)}
                        >
                          <td className="py-3 px-4 text-muted-foreground font-bold">{i + 1}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold">{team.team}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-bold text-emerald-400">{team.gol_fatti}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-bold text-red-400">{team.gol_subiti}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`font-bold text-sm ${team.diff > 0 ? "text-emerald-400" : team.diff < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                              {team.diff > 0 ? `+${team.diff}` : team.diff}
                            </span>
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell">
                            {team.top_scorers.length > 0 ? (
                              <span className="text-xs text-muted-foreground">
                                {team.top_scorers.map((s) => `${s.name} (${s.goals})`).join(", ")}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </td>
                        </tr>
                        {/* Mobile: marcatori expandable */}
                        {isExpanded && team.top_scorers.length > 0 && (
                          <tr key={`${team.team}-exp`} className="sm:hidden bg-stork-dark/30">
                            <td colSpan={5} className="px-4 py-2">
                              <p className="text-xs text-muted-foreground mb-1 font-semibold">Marcatori:</p>
                              {team.top_scorers.map((s) => (
                                <div key={s.name} className="flex justify-between text-xs py-0.5">
                                  <span className="text-foreground">{s.name}</span>
                                  <span className="text-stork-gold font-bold">{s.goals} gol</span>
                                </div>
                              ))}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="text-[11px] text-muted-foreground px-1">
            GF = Gol Fatti · GS = Gol Subiti · Diff = Differenza reti · Tocca una squadra per vedere i marcatori (mobile)
          </p>
        </section>
      )}

      {/* ── TOP MARCATORI ── */}
      {topScorers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Target className="w-4 h-4" /> Classifica Marcatori
          </h2>
          <Card className="border-stork-dark-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stork-dark-border bg-stork-dark/50">
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider w-8">#</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Giocatore</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden sm:table-cell">Squadra</th>
                    <th className="text-center py-3 px-3 text-xs text-stork-gold font-semibold uppercase tracking-wider">Gol</th>
                    <th className="text-center py-3 px-3 text-xs text-blue-400 font-semibold uppercase tracking-wider">Ass</th>
                    <th className="text-center py-3 px-3 text-xs text-stork-orange font-semibold uppercase tracking-wider hidden sm:table-cell">Punti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stork-dark-border">
                  {topScorers.slice(0, scorersLimit).map((player, i) => (
                    <tr key={player.player_id} className={`hover:bg-stork-dark/40 transition-colors ${i < 3 ? "bg-stork-gold/3" : ""}`}>
                      <td className="py-3 px-4">
                        {i === 0 ? (
                          <span className="text-stork-gold font-black">🥇</span>
                        ) : i === 1 ? (
                          <span className="text-muted-foreground font-black">🥈</span>
                        ) : i === 2 ? (
                          <span className="font-black" style={{ color: "#cd7f32" }}>🥉</span>
                        ) : (
                          <span className="text-muted-foreground font-bold text-xs">{i + 1}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold">{player.name}</p>
                        <p className="text-xs text-muted-foreground sm:hidden">{player.team}</p>
                        <p className="text-xs text-muted-foreground">{PLAYER_ROLE_LABELS[player.role as "P" | "M"] ?? player.role}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground hidden sm:table-cell">{player.team}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-black text-stork-gold">{player.total_goals}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-blue-400">{player.total_assists}</span>
                      </td>
                      <td className="py-3 px-3 text-center hidden sm:table-cell">
                        <span className="font-bold text-stork-orange">{player.total_points.toFixed(1)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {topScorers.length > scorersLimit && (
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
      {topScorers.filter((s) => s.total_assists > 0).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Zap className="w-4 h-4" /> Classifica Assist
          </h2>
          <Card className="border-stork-dark-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stork-dark-border bg-stork-dark/50">
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider w-8">#</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Giocatore</th>
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden sm:table-cell">Squadra</th>
                    <th className="text-center py-3 px-3 text-xs text-blue-400 font-semibold uppercase tracking-wider">Assist</th>
                    <th className="text-center py-3 px-3 text-xs text-stork-gold font-semibold uppercase tracking-wider">Gol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stork-dark-border">
                  {[...topScorers]
                    .filter((s) => s.total_assists > 0)
                    .sort((a, b) => b.total_assists - a.total_assists)
                    .slice(0, 10)
                    .map((player, i) => (
                      <tr key={player.player_id} className={`hover:bg-stork-dark/40 transition-colors ${i < 3 ? "bg-blue-500/3" : ""}`}>
                        <td className="py-3 px-4 text-muted-foreground font-bold text-xs">{i + 1}</td>
                        <td className="py-3 px-4">
                          <p className="font-semibold">{player.name}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{player.team}</p>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground hidden sm:table-cell">{player.team}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-black text-blue-400">{player.total_assists}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-stork-gold">{player.total_goals}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {teamStats.length === 0 && topScorers.length === 0 && matches.length === 0 && (
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
