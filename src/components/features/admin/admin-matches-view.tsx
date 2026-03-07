"use client";

import { useEffect, useState } from "react";
import { Swords, Plus, Trash2, Clock, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getDailyMatches, createDailyMatch, deleteDailyMatch, type DailyMatch } from "@/lib/db/matches";
import { useLeagueStore } from "@/store/league";
import { useToast } from "@/hooks/use-toast";

function groupByDate(matches: DailyMatch[]): Record<string, DailyMatch[]> {
  return matches.reduce<Record<string, DailyMatch[]>>((acc, m) => {
    const date = new Date(m.match_datetime).toLocaleDateString("it-IT", {
      weekday: "long", day: "numeric", month: "long",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(m);
    return acc;
  }, {});
}

export function AdminMatchesView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";
  const { toast } = useToast();

  const [matches, setMatches] = useState<DailyMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [matchDatetime, setMatchDatetime] = useState("");
  const [competition, setCompetition] = useState("Serie A");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!leagueId) return;
    getDailyMatches(leagueId)
      .then(setMatches)
      .finally(() => setIsLoading(false));
  }, [leagueId]);

  async function handleCreate() {
    if (!homeTeam.trim() || !awayTeam.trim() || !matchDatetime) {
      toast({ variant: "destructive", title: "Compila tutti i campi obbligatori" });
      return;
    }
    setIsSaving(true);
    try {
      const match = await createDailyMatch(leagueId, {
        home_team: homeTeam.trim(),
        away_team: awayTeam.trim(),
        match_datetime: matchDatetime,
        competition: competition.trim() || "Serie A",
      });
      setMatches((prev) => [...prev, match].sort(
        (a, b) => new Date(a.match_datetime).getTime() - new Date(b.match_datetime).getTime()
      ));
      setHomeTeam(""); setAwayTeam(""); setMatchDatetime(""); setCompetition("Serie A");
      toast({ title: "Partita aggiunta!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDailyMatch(id);
      setMatches((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Partita eliminata" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
  }

  const grouped = groupByDate(matches);

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Swords className="w-6 h-6 text-stork-orange" />
        <h1 className="text-2xl font-bold">Partite del Giorno</h1>
      </div>

      {/* Form aggiunta partita */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Aggiungi Partita
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Squadra Casa</label>
              <Input
                placeholder="Es. Juventus"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Squadra Ospite</label>
              <Input
                placeholder="Es. Inter"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data e Ora</label>
              <Input
                type="datetime-local"
                value={matchDatetime}
                onChange={(e) => setMatchDatetime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Competizione</label>
              <Input
                placeholder="Serie A"
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCreate} disabled={isSaving}>
              <Plus className="w-4 h-4" />
              {isSaving ? "Salvataggio..." : "Aggiungi Partita"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista partite raggruppate per data */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Swords className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Nessuna partita inserita</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([date, dayMatches]) => (
            <div key={date}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1 capitalize">
                {date}
              </p>
              <div className="space-y-2">
                {dayMatches.map((match) => {
                  const time = new Date(match.match_datetime).toLocaleTimeString("it-IT", {
                    hour: "2-digit", minute: "2-digit",
                  });
                  return (
                    <Card key={match.id} className="border-stork-dark-border">
                      <CardContent className="p-4 flex items-center gap-4">
                        {/* Competizione + orario */}
                        <div className="flex flex-col items-center gap-1 min-w-[56px]">
                          <div className="flex items-center gap-1 text-stork-orange">
                            <Clock className="w-3 h-3" />
                            <span className="text-sm font-bold">{time}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground text-center leading-tight">{match.competition}</span>
                        </div>

                        {/* Partita */}
                        <div className="flex-1 flex items-center justify-center gap-3">
                          <span className="font-semibold text-sm text-right flex-1">{match.home_team}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Trophy className="w-3.5 h-3.5 text-stork-gold opacity-50" />
                            <span className="text-xs text-muted-foreground font-medium">VS</span>
                            <Trophy className="w-3.5 h-3.5 text-stork-gold opacity-50" />
                          </div>
                          <span className="font-semibold text-sm text-left flex-1">{match.away_team}</span>
                        </div>

                        {/* Elimina */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:text-destructive hover:bg-destructive/10 shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminare la partita?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {match.home_team} vs {match.away_team} verrà rimossa definitivamente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(match.id)} className="bg-destructive hover:bg-destructive/90">
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
