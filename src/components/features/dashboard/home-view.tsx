"use client";

import { useEffect, useState } from "react";
import { Trophy, Coins, Users, TrendingUp, Calendar, Tv, Star, ExternalLink, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { getMyTeam, getProfile } from "@/lib/db/teams";
import { getAppSettings, getSponsors } from "@/lib/db/settings";
import { getMatchdays } from "@/lib/db/matchdays";
import { useLeagueStore } from "@/store/league";
import { formatPoints, formatCredits } from "@/lib/utils";
import { SPONSOR_TYPE_LABELS } from "@/lib/constants";
import type { Profile, UserTeam, AppSettings, Matchday, Sponsor } from "@/types";

export function HomeView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [lastMatchday, setLastMatchday] = useState<Matchday | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!leagueId) return;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [prof, set, matchdays, sps] = await Promise.all([
        getProfile(user.id),
        getAppSettings(leagueId),
        getMatchdays(leagueId),
        getSponsors(leagueId),
      ]);
      setProfile(prof);
      setSettings(set);
      setSponsors(sps);
      const calculated = matchdays.filter((m) => m.status === "calculated");
      if (calculated.length > 0) setLastMatchday(calculated[0]);
      if (prof) setTeam(await getMyTeam(user.id, leagueId));
      setIsLoading(false);
    }
    load();
  }, [leagueId]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const myPoints = team?.total_points ?? 0;
  const myCredits = team?.credits ?? 0;
  const myPlayersCount = team?.players.length ?? 0;
  const lastDayPoints = lastMatchday ? (team?.matchday_points?.[lastMatchday.id] ?? 0) : null;

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Benvenuto</p>
          <h1 className="text-3xl font-black">
            <span className="text-gradient">{profile?.manager_name ?? "Allenatore"}</span>
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-stork-gold" />
            {profile?.team_name ?? "La tua squadra"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Badge variant={settings?.market_open ? "success" : "secondary"} className="gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${settings?.market_open ? "bg-emerald-400" : "bg-muted-foreground"}`} />
            {settings?.market_open ? "Mercato Aperto" : "Mercato Chiuso"}
          </Badge>
          <Badge variant={settings?.lineup_locked ? "warning" : "success"} className="gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${settings?.lineup_locked ? "bg-stork-gold" : "bg-emerald-400"}`} />
            {settings?.lineup_locked ? "Formazione Bloccata" : "Formazione Libera"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Trophy} label="Punti Totali" value={formatPoints(myPoints)} color="text-stork-orange" bg="bg-stork-orange/15" border="border-stork-orange/25" accent="from-stork-orange to-stork-gold-dark" glow />
        <StatCard icon={Coins} label="Crediti SK" value={formatCredits(myCredits)} color="text-yellow-400" bg="bg-yellow-400/15" border="border-yellow-400/25" accent="from-yellow-400 to-yellow-600" />
        <StatCard icon={Users} label="Giocatori" value={`${myPlayersCount}/${settings?.max_players_per_team ?? 15}`} color="text-blue-400" bg="bg-blue-500/15" border="border-blue-500/25" accent="from-blue-400 to-blue-600" />
        <StatCard
          icon={TrendingUp}
          label="Ultima Giornata"
          value={lastDayPoints !== null ? `+${formatPoints(lastDayPoints)} pt` : "—"}
          color="text-emerald-400"
          bg="bg-emerald-500/15"
          border="border-emerald-500/25"
          accent="from-emerald-400 to-emerald-600"
        />
      </div>

      {lastMatchday && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stork-dark border border-stork-dark-border">
          <Calendar className="w-4 h-4 text-stork-orange shrink-0" />
          <span className="text-sm text-muted-foreground">Ultima giornata calcolata:</span>
          <span className="text-sm font-semibold text-foreground">{lastMatchday.name}</span>
        </div>
      )}

      {settings?.youtube_url && (
        <Card className="border-red-500/20 overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-red-500/5 to-transparent">
            <CardTitle className="flex items-center gap-2 text-base">
              <Tv className="w-4 h-4 text-red-400" />
              Live Stream
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-pulse">● LIVE</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="aspect-video bg-black rounded-b-xl overflow-hidden">
              <iframe
                src={settings.youtube_url.replace("watch?v=", "embed/")}
                title="Live Stream"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </CardContent>
        </Card>
      )}

      {team && Object.keys(team.matchday_points ?? {}).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-stork-orange" />
              Storico Punti
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {Object.entries(team.matchday_points).slice(0, 6).map(([dayId, pts], i) => (
              <div key={dayId} className={`flex justify-between items-center px-5 py-3 ${i % 2 === 0 ? "bg-stork-dark/50" : ""}`}>
                <span className="text-sm text-muted-foreground">Giornata {i + 1}</span>
                <span className={`text-sm font-bold ${(pts as number) > 0 ? "text-stork-orange" : "text-muted-foreground"}`}>
                  {formatPoints(pts as number)} pt
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {sponsors.length > 0 && (
        <div className="pt-4 border-t border-stork-dark-border space-y-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground text-center">I nostri Sponsor</p>
          {sponsors.filter((s) => s.type === "main").length > 0 && (
            <div className="flex flex-wrap justify-center gap-4">
              {sponsors.filter((s) => s.type === "main").map((s) => (
                <a key={s.id} href={s.website_url ?? undefined} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-5 py-3 rounded-xl hover:bg-stork-dark/60 transition-all group">
                  {s.logo_url && <img src={s.logo_url} alt={s.name} className="h-10 w-auto object-contain" />}
                  <span className="font-bold text-foreground">{s.name}</span>
                  {s.website_url && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                </a>
              ))}
            </div>
          )}
          {sponsors.filter((s) => s.type !== "main").length > 0 && (
            <div className="flex flex-wrap justify-center gap-3">
              {sponsors.filter((s) => s.type !== "main").map((s) => (
                <a key={s.id} href={s.website_url ?? undefined} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-stork-dark/60 transition-all group">
                  {s.logo_url && <img src={s.logo_url} alt={s.name} className="h-6 w-auto object-contain" />}
                  <span className="text-sm font-semibold text-foreground">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{SPONSOR_TYPE_LABELS[s.type]}</span>
                  {s.website_url && <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg, border, accent, glow }: {
  icon: React.ElementType; label: string; value: string;
  color: string; bg: string; border: string; accent: string; glow?: boolean;
}) {
  return (
    <Card className={`border ${border} overflow-hidden hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300 ${glow ? "hover:shadow-glow-orange" : ""}`}>
      <div className={`h-1 w-full bg-gradient-to-r ${accent}`} />
      <CardContent className="p-4 pt-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <p className={`text-3xl font-black ${color} leading-none`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-2 font-medium uppercase tracking-wide">{label}</p>
      </CardContent>
    </Card>
  );
}
