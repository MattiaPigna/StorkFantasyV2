"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, BookOpen, Users, ShoppingCart, ArrowRight, Coins, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarketView } from "@/components/features/dashboard/market-view";
import { createClient } from "@/lib/supabase/client";
import { getMyTeam } from "@/lib/db/teams";
import { getFantasyRules, getSpecialCards } from "@/lib/db/settings";
import { getTournamentTeams } from "@/lib/db/tournament-teams";
import { useLeagueStore } from "@/store/league";
import type { RuleEntry, SpecialCard } from "@/types";
import type { TournamentTeam } from "@/lib/db/tournament-teams";
import Image from "next/image";

type Tab = "regole" | "squadre" | "mercato";

export function OnboardingView() {
  const router = useRouter();
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [tab, setTab] = useState<Tab>("regole");
  const [playerCount, setPlayerCount] = useState(0);
  const [credits, setCredits] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [rules, setRules] = useState<RuleEntry[]>([]);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [cards, setCards] = useState<SpecialCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!leagueId) return;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [team, r, t, c] = await Promise.all([
        getMyTeam(user.id, leagueId),
        getFantasyRules(leagueId),
        getTournamentTeams(leagueId),
        getSpecialCards(leagueId),
      ]);

      setPlayerCount(team?.players?.length ?? 0);
      setCredits(team?.credits ?? 0);
      setRules(r);
      setTeams(t);
      setCards(c);
      setIsLoading(false);
    }
    load();
  }, [leagueId]);

  // Poll player count when on mercato tab so bar updates in real time
  useEffect(() => {
    if (tab !== "mercato" || !userId || !leagueId) return;
    const interval = setInterval(async () => {
      const team = await getMyTeam(userId, leagueId).catch(() => null);
      setPlayerCount(team?.players?.length ?? 0);
      setCredits(team?.credits ?? 0);
    }, 3000);
    return () => clearInterval(interval);
  }, [tab, userId, leagueId]);

  const bonusPartita = rules.filter((r) => r.type === "bonus" && r.category !== "spettacolo");
  const bonusSpettacolo = rules.filter((r) => r.type === "bonus" && r.category === "spettacolo");
  const malusPartita = rules.filter((r) => r.type === "malus" && r.category !== "spettacolo");
  const malusSpettacolo = rules.filter((r) => r.type === "malus" && r.category === "spettacolo");

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "regole", label: "Regole", icon: BookOpen },
    { key: "squadre", label: "Squadre", icon: Users },
    { key: "mercato", label: "Mercato", icon: ShoppingCart },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-stork-dark-card border-b border-stork-dark-border px-4 py-5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-stork-orange to-stork-gold-dark flex items-center justify-center shadow-glow-orange shrink-0">
              <Trophy className="w-4 h-4 text-black" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Benvenuto in</p>
              <p className="font-black text-gradient text-lg leading-tight">{activeLeague?.name ?? "StorkLeague"}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Prima di accedere alla dashboard, leggi le regole, esplora le squadre e acquista i tuoi giocatori.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-stork-dark-card border-b border-stork-dark-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all ${
                  tab === key
                    ? "border-stork-orange text-stork-orange"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 pb-32 overflow-y-auto">
        {tab === "regole" && (
          <div className="max-w-3xl mx-auto p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <RuleCard title="Bonus Partita" icon={TrendingUp} color="text-green-400" rules={bonusPartita} variant="success" prefix="+" />
                  <RuleCard title="Bonus Spettacolo" icon={TrendingUp} color="text-purple-400" rules={bonusSpettacolo} variant="success" prefix="+" />
                  <RuleCard title="Malus Partita" icon={TrendingDown} color="text-red-400" rules={malusPartita} variant="destructive" prefix="" />
                  <RuleCard title="Malus Spettacolo" icon={TrendingDown} color="text-orange-400" rules={malusSpettacolo} variant="destructive" prefix="" />
                </div>

                {cards.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Card Speciali</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {cards.map((card) => (
                        <Card key={card.id} className="overflow-hidden">
                          {card.image_url && (
                            <div className="aspect-[3/1] relative bg-muted overflow-hidden">
                              <Image src={card.image_url} alt={card.name} fill className="object-cover" />
                            </div>
                          )}
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                              <Zap className="w-4 h-4 text-stork-orange shrink-0 mt-0.5" />
                              <div>
                                <p className="font-semibold text-sm">{card.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
                                {card.effect && <p className="text-xs text-stork-orange mt-1 font-medium">Effetto: {card.effect}</p>}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button onClick={() => setTab("squadre")}>
                    Avanti: Squadre <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "squadre" && (
          <div className="max-w-3xl mx-auto p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
              </div>
            ) : teams.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nessuna squadra ancora inserita</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {teams.map((team) => (
                    <Card key={team.id} className="hover:border-stork-orange/30 transition-all">
                      <CardContent className="p-4 flex flex-col items-center gap-3 text-center">
                        {team.logo_url ? (
                          <div className="w-16 h-16 relative">
                            <Image src={team.logo_url} alt={team.name} fill className="object-contain" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-stork-dark flex items-center justify-center">
                            <Users className="w-7 h-7 text-muted-foreground" />
                          </div>
                        )}
                        <p className="font-semibold text-sm leading-tight">{team.name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={() => setTab("mercato")}>
                    Avanti: Acquista Giocatori <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "mercato" && <MarketView />}
      </div>

      {/* Sticky bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-stork-dark-card/95 backdrop-blur-md border-t border-stork-dark-border px-4 py-3 flex items-center justify-between gap-4 z-20"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-stork-orange" />
            <span className="font-bold text-foreground">{playerCount}</span>
            <span className="text-muted-foreground">giocatori</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-foreground">{credits}</span>
            <span className="text-muted-foreground">SK</span>
          </div>
        </div>

        <Button
          disabled={playerCount === 0}
          onClick={() => router.push("/dashboard/home")}
          className={playerCount > 0 ? "shadow-glow-orange" : ""}
        >
          {playerCount === 0 ? "Acquista almeno 1 giocatore" : "Accedi alla Dashboard"}
          {playerCount > 0 && <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

function RuleCard({
  title, icon: Icon, color, rules, variant, prefix,
}: {
  title: string; icon: React.ElementType; color: string;
  rules: RuleEntry[]; variant: "success" | "destructive"; prefix: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className={`w-4 h-4 ${color}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 p-4 pt-0">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-stork-dark-border last:border-0">
            <p className="text-sm">{r.label}</p>
            <Badge variant={variant}>{prefix}{r.points} pt</Badge>
          </div>
        ))}
        {rules.length === 0 && <p className="text-xs text-muted-foreground">Nessuna regola</p>}
      </CardContent>
    </Card>
  );
}
