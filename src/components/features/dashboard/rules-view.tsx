"use client";

import { useEffect, useState } from "react";
import { BookOpen, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFantasyRules, getTournamentRules } from "@/lib/db/settings";
import type { RuleEntry, TournamentRules } from "@/types";

export function RulesView() {
  const [rules, setRules] = useState<RuleEntry[]>([]);
  const [tournament, setTournament] = useState<TournamentRules | null>(null);
  const [tab, setTab] = useState<"scoring" | "tournament">("scoring");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getFantasyRules(), getTournamentRules()])
      .then(([r, t]) => {
        setRules(r);
        setTournament(t);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const bonuses = rules.filter((r) => r.type === "bonus");
  const maluses = rules.filter((r) => r.type === "malus");

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
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === "scoring" ? (
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Bonuses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-4 h-4 text-green-400" />
                Bonus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {bonuses.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between py-2 border-b border-stork-dark-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{rule.label}</p>
                    {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                  </div>
                  <Badge variant="success">+{rule.points} pt</Badge>
                </div>
              ))}
              {bonuses.length === 0 && <p className="text-sm text-muted-foreground">Nessun bonus configurato</p>}
            </CardContent>
          </Card>

          {/* Maluses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="w-4 h-4 text-red-400" />
                Malus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {maluses.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between py-2 border-b border-stork-dark-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{rule.label}</p>
                    {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                  </div>
                  <Badge variant="destructive">{rule.points} pt</Badge>
                </div>
              ))}
              {maluses.length === 0 && <p className="text-sm text-muted-foreground">Nessun malus configurato</p>}
            </CardContent>
          </Card>
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
