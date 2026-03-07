"use client";

import { useEffect, useState } from "react";
import { BookOpen, TrendingUp, TrendingDown, FileText, CreditCard, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFantasyRules, getTournamentRules, getSpecialCards } from "@/lib/db/settings";
import { useLeagueStore } from "@/store/league";
import type { RuleEntry, TournamentRules, SpecialCard } from "@/types";
import Image from "next/image";

export function RulesView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [rules, setRules] = useState<RuleEntry[]>([]);
  const [tournament, setTournament] = useState<TournamentRules | null>(null);
  const [cards, setCards] = useState<SpecialCard[]>([]);
  const [tab, setTab] = useState<"scoring" | "tournament" | "cards">("scoring");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!leagueId) return;
    Promise.all([getFantasyRules(leagueId), getTournamentRules(leagueId), getSpecialCards(leagueId)])
      .then(([r, t, c]) => {
        setRules(r);
        setTournament(t);
        setCards(c);
      })
      .finally(() => setIsLoading(false));
  }, [leagueId]);

  const bonusPartita = rules.filter((r) => r.type === "bonus" && r.category !== "spettacolo");
  const bonusSpettacolo = rules.filter((r) => r.type === "bonus" && r.category === "spettacolo");
  const malusPartita = rules.filter((r) => r.type === "malus" && r.category !== "spettacolo");
  const malusSpettacolo = rules.filter((r) => r.type === "malus" && r.category === "spettacolo");

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-stork-orange" />
        <h1 className="text-2xl font-bold">Regole</h1>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-muted p-1 w-fit">
        <button
          onClick={() => setTab("scoring")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === "scoring" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
        >
          Punteggio
        </button>
        <button
          onClick={() => setTab("tournament")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === "tournament" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
        >
          Regolamento
        </button>
        <button
          onClick={() => setTab("cards")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === "cards" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
        >
          Card
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === "cards" ? (
        cards.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nessuna card speciale disponibile</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cards.map((card) => (
              <Card key={card.id} className="overflow-hidden hover:border-stork-orange/30 transition-all hover:-translate-y-0.5">
                {card.image_url && (
                  <div className="aspect-[3/2] relative bg-muted overflow-hidden">
                    <Image src={card.image_url} alt={card.name} fill className="object-cover" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-stork-orange shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">{card.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                      {card.effect && (
                        <p className="text-xs text-stork-orange mt-2 font-medium">Effetto: {card.effect}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : tab === "scoring" ? (
        <div className="space-y-5">
          {/* Bonus Partita + Bonus Spettacolo */}
          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  Bonus Partita
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {bonusPartita.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between py-2 border-b border-stork-dark-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{rule.label}</p>
                      {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                    </div>
                    <Badge variant="success">+{rule.points} pt</Badge>
                  </div>
                ))}
                {bonusPartita.length === 0 && <p className="text-sm text-muted-foreground">Nessun bonus partita</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  Bonus Spettacolo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {bonusSpettacolo.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between py-2 border-b border-stork-dark-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{rule.label}</p>
                      {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                    </div>
                    <Badge variant="success">+{rule.points} pt</Badge>
                  </div>
                ))}
                {bonusSpettacolo.length === 0 && <p className="text-sm text-muted-foreground">Nessun bonus spettacolo</p>}
              </CardContent>
            </Card>
          </div>

          {/* Malus Partita + Malus Spettacolo */}
          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  Malus Partita
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {malusPartita.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between py-2 border-b border-stork-dark-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{rule.label}</p>
                      {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                    </div>
                    <Badge variant="destructive">{rule.points} pt</Badge>
                  </div>
                ))}
                {malusPartita.length === 0 && <p className="text-sm text-muted-foreground">Nessun malus partita</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingDown className="w-4 h-4 text-orange-400" />
                  Malus Spettacolo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {malusSpettacolo.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between py-2 border-b border-stork-dark-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{rule.label}</p>
                      {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                    </div>
                    <Badge variant="destructive">{rule.points} pt</Badge>
                  </div>
                ))}
                {malusSpettacolo.length === 0 && <p className="text-sm text-muted-foreground">Nessun malus spettacolo</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-stork-orange" />
              Regolamento del Torneo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tournament?.content_html ? (
              <div
                className="prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: tournament.content_html }}
              />
            ) : tournament?.pdf_url ? (
              <a href={tournament.pdf_url} target="_blank" rel="noopener noreferrer">
                <button className="flex items-center gap-2 text-stork-orange underline text-sm">
                  <FileText className="w-4 h-4" />
                  Scarica Regolamento PDF
                </button>
              </a>
            ) : (
              <p className="text-muted-foreground text-sm">Nessun regolamento disponibile</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
