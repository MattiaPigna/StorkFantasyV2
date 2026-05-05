"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, Zap, Target, Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStandings } from "@/lib/db/teams";
import { getTopScorers, type TopScorer } from "@/lib/db/players";
import { getMatchdays } from "@/lib/db/matchdays";
import { useLeagueStore } from "@/store/league";
import { formatPoints, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { StandingEntry } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { PLAYER_ROLE_COLORS, PLAYER_ROLE_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

type Tab = "classifica" | "marcatori";

export function StandingsView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [tab, setTab] = useState<Tab>("classifica");
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [topScorers, setTopScorers] = useState<TopScorer[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [lastMatchdayId, setLastMatchdayId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!leagueId) return;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setMyUserId(user?.id ?? null);
        const [data, scorers, matchdays] = await Promise.all([
          getStandings(leagueId),
          getTopScorers(leagueId),
          getMatchdays(leagueId),
        ]);
        setStandings(data);
        setTopScorers(scorers);
        const calculated = matchdays.filter((m) => m.status === "calculated");
        if (calculated.length > 0) setLastMatchdayId(calculated[0].id);
      } catch {
        // show empty state rather than infinite spinner
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [leagueId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const myRank = standings.find((s) => s.user_id === myUserId);

  // Compute previous rank (before last matchday)
  const prevRankMap = new Map<string, number>();
  if (lastMatchdayId) {
    const prevStandings = [...standings]
      .map((s) => ({
        user_id: s.user_id,
        prev_points: s.total_points - (s.matchday_points?.[lastMatchdayId] ?? 0),
      }))
      .sort((a, b) => b.prev_points - a.prev_points);
    prevStandings.forEach((s, i) => prevRankMap.set(s.user_id, i + 1));
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-stork-orange" />
        <h1 className="text-2xl font-bold">Classifica</h1>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl bg-stork-dark p-1 border border-stork-dark-border w-fit">
        {([
          { key: "classifica", label: "Squadre", icon: Trophy },
          { key: "marcatori", label: "Marcatori", icon: Zap },
        ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              tab === key
                ? "bg-gradient-to-r from-stork-orange to-stork-gold-dark text-black shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "classifica" && (
        <>
          {myRank && (
            <Card className="border-stork-orange/40 bg-stork-orange/5">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">La tua posizione</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-stork-orange">#{myRank.rank}</span>
                    <div>
                      <p className="font-semibold text-foreground">{myRank.team_name}</p>
                      <p className="text-xs text-muted-foreground">{myRank.manager_name}</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-stork-orange">{formatPoints(myRank.total_points)} pt</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Classifica Completa</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-stork-dark-border">
                {standings.map((entry) => {
                  const prevRank = prevRankMap.get(entry.user_id);
                  const delta = prevRank != null ? prevRank - entry.rank : null;
                  return (
                    <div
                      key={entry.user_id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 transition-colors",
                        entry.user_id === myUserId && "bg-stork-orange/5",
                        entry.rank <= 3 && "bg-muted/30"
                      )}
                    >
                      <div className="w-8 flex items-center justify-center">
                        {entry.rank === 1 ? (
                          <Trophy className="w-5 h-5 text-yellow-400" />
                        ) : entry.rank === 2 ? (
                          <Medal className="w-5 h-5 text-gray-300" />
                        ) : entry.rank === 3 ? (
                          <Medal className="w-5 h-5 text-amber-600" />
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground">{entry.rank}</span>
                        )}
                      </div>
                      <div className="w-9 h-9 rounded-full bg-gradient-stork flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {getInitials(entry.team_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold truncate", entry.user_id === myUserId && "text-stork-orange")}>
                          {entry.team_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{entry.manager_name}</p>
                      </div>
                      {delta !== null && (
                        <div className={cn("flex items-center gap-0.5 text-xs font-bold shrink-0",
                          delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-muted-foreground"
                        )}>
                          {delta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : delta < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                          {delta !== 0 && <span>{Math.abs(delta)}</span>}
                        </div>
                      )}
                      <span className={cn("text-sm font-bold", entry.rank <= 3 ? "text-stork-orange" : "text-foreground")}>
                        {formatPoints(entry.total_points)} pt
                      </span>
                    </div>
                  );
                })}
                {standings.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Nessun risultato ancora</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "marcatori" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-stork-orange" />
              Classifica Marcatori
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-stork-dark-border">
              {topScorers.map((player, i) => (
                <div key={player.player_id} className={cn("flex items-center gap-3 px-4 py-3", i < 3 && "bg-muted/30")}>
                  <div className="w-8 flex items-center justify-center">
                    {i === 0 ? (
                      <Trophy className="w-5 h-5 text-yellow-400" />
                    ) : i === 1 ? (
                      <Medal className="w-5 h-5 text-gray-300" />
                    ) : i === 2 ? (
                      <Medal className="w-5 h-5 text-amber-600" />
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">{i + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold truncate">{player.name}</p>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", PLAYER_ROLE_COLORS[player.role])}>
                        {PLAYER_ROLE_LABELS[player.role] ?? player.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{player.team}</span>
                      <span className="flex items-center gap-1"><Target className="w-3 h-3" />{player.total_goals} gol</span>
                      <span className="flex items-center gap-1"><Star className="w-3 h-3" />{player.total_assists} assist</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={cn("text-sm font-bold", i < 3 ? "text-stork-orange" : "text-foreground")}>
                      {formatPoints(player.total_points)} pt
                    </p>
                    <p className="text-xs text-muted-foreground">{player.matchdays_played} gg</p>
                  </div>
                </div>
              ))}
              {topScorers.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Nessuna statistica disponibile</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
