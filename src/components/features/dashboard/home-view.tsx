"use client";

import { useEffect, useState } from "react";
import { Trophy, Coins, Users, TrendingUp, Calendar, Tv } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { getMyTeam, getProfile } from "@/lib/db/teams";
import { getAppSettings } from "@/lib/db/settings";
import { getMatchdays } from "@/lib/db/matchdays";
import { formatPoints, formatCredits } from "@/lib/utils";
import type { Profile, UserTeam, AppSettings, Matchday } from "@/types";

export function HomeView() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [lastMatchday, setLastMatchday] = useState<Matchday | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [prof, set, matchdays] = await Promise.all([
        getProfile(user.id),
        getAppSettings(),
        getMatchdays(),
      ]);

      setProfile(prof);
      setSettings(set);

      const calculated = matchdays.filter((m) => m.status === "calculated");
      if (calculated.length > 0) setLastMatchday(calculated[0]);

      if (prof) {
        const t = await getMyTeam(user.id);
        setTeam(t);
      }
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

  const myPoints = team?.total_points ?? 0;
  const myCredits = team?.credits ?? 0;
  const myPlayersCount = team?.players.length ?? 0;

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Ciao, <span className="text-gradient">{profile?.manager_name ?? "Allenatore"}</span>!
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {profile?.team_name ?? "La tua squadra"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Trophy}
          label="Punti Totali"
          value={formatPoints(myPoints)}
          color="text-stork-orange"
          bgColor="bg-stork-orange/10"
        />
        <StatCard
          icon={Coins}
          label="Crediti"
          value={formatCredits(myCredits)}
          color="text-yellow-400"
          bgColor="bg-yellow-500/10"
        />
        <StatCard
          icon={Users}
          label="Giocatori"
          value={`${myPlayersCount}/15`}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <StatCard
          icon={TrendingUp}
          label="Ultima Giornata"
          value={lastMatchday ? formatPoints(team?.matchday_points?.[lastMatchday.id] ?? 0) : "-"}
          color="text-green-400"
          bgColor="bg-green-500/10"
        />
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={settings?.market_open ? "success" : "outline"}>
          {settings?.market_open ? "🟢 Mercato Aperto" : "🔴 Mercato Chiuso"}
        </Badge>
        <Badge variant={settings?.lineup_locked ? "destructive" : "success"}>
          {settings?.lineup_locked ? "🔒 Formazione Bloccata" : "✏️ Formazione Modificabile"}
        </Badge>
        {lastMatchday && (
          <Badge variant="secondary">
            <Calendar className="w-3 h-3 mr-1" />
            Ultima: {lastMatchday.name}
          </Badge>
        )}
      </div>

      {/* Live Stream */}
      {settings?.youtube_url && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Tv className="w-4 h-4 text-red-500" />
              Live Stream
              <Badge variant="destructive" className="text-xs">LIVE</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <iframe
                src={settings.youtube_url.replace("watch?v=", "embed/")}
                title="Live Stream StorkLeague"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matchday history */}
      {team && Object.keys(team.matchday_points ?? {}).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Storico Punti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(team.matchday_points)
                .slice(0, 5)
                .map(([dayId, pts]) => (
                  <div key={dayId} className="flex justify-between items-center py-1.5 border-b border-stork-dark-border last:border-0">
                    <span className="text-sm text-muted-foreground">Giornata</span>
                    <span className="text-sm font-semibold text-stork-orange">{formatPoints(pts)} pt</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <Card className="hover:border-stork-orange/30 transition-colors">
      <CardContent className="p-4">
        <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center mb-2`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}
