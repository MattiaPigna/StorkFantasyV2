"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStandings } from "@/lib/db/teams";
import { formatPoints, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { StandingEntry } from "@/types";
import { createClient } from "@/lib/supabase/client";

export function StandingsView() {
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setMyUserId(user?.id ?? null);

      const data = await getStandings();
      setStandings(data);
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const myRank = standings.find((s) => s.user_id === myUserId);

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-stork-orange" />
        <h1 className="text-2xl font-bold">Classifica</h1>
      </div>

      {/* My position highlight */}
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

      {/* Full standings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Classifica Completa</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-stork-dark-border">
            {standings.map((entry) => (
              <div
                key={entry.user_id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors",
                  entry.user_id === myUserId && "bg-stork-orange/5",
                  entry.rank <= 3 && "bg-muted/30"
                )}
              >
                {/* Rank */}
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

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full gradient-stork flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {getInitials(entry.team_name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold truncate", entry.user_id === myUserId && "text-stork-orange")}>
                    {entry.team_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{entry.manager_name}</p>
                </div>

                {/* Points */}
                <span className={cn("text-sm font-bold", entry.rank <= 3 ? "text-stork-orange" : "text-foreground")}>
                  {formatPoints(entry.total_points)} pt
                </span>
              </div>
            ))}

            {standings.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Nessun risultato ancora</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
