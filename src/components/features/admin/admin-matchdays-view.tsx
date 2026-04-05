"use client";

import { useEffect, useState } from "react";
import { Calendar, Plus, Calculator, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getMatchdays, createMatchday, savePlayerStats, calculateMatchdayResults, deleteMatchday, getMatchdayStats } from "@/lib/db/matchdays";
import { getPlayers } from "@/lib/db/players";
import { useLeagueStore } from "@/store/league";
import { useToast } from "@/hooks/use-toast";
import type { Matchday, Player, PlayerMatchStats } from "@/types";

export function AdminMatchdaysView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [matchdays, setMatchdays] = useState<Matchday[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, Partial<PlayerMatchStats>>>({});
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!leagueId) return;
    Promise.all([getMatchdays(leagueId), getPlayers(leagueId)])
      .then(([m, p]) => { setMatchdays(m); setPlayers(p); })
      .finally(() => setIsLoading(false));
  }, [leagueId]);

  // Preload existing stats whenever a matchday is expanded
  useEffect(() => {
    if (!expandedId) { setStats({}); return; }
    getMatchdayStats(expandedId)
      .then((existing) => setStats(existing as Record<string, Partial<PlayerMatchStats>>))
      .catch(() => setStats({}));
  }, [expandedId]);

  async function handleCreate() {
    if (!leagueId) {
      toast({ variant: "destructive", title: "Nessuna lega selezionata" });
      return;
    }
    const num = parseInt(newNumber, 10);
    if (!newName.trim() || !newNumber.trim() || isNaN(num)) {
      toast({ variant: "destructive", title: "Dati non validi", description: "Inserisci nome e numero giornata" });
      return;
    }
    try {
      const md = await createMatchday(leagueId, { name: newName.trim(), number: num });
      setMatchdays((prev) => [md, ...prev]);
      setNewName(""); setNewNumber("");
      toast({ title: "Giornata creata!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
  }

  async function handleSaveStats(matchdayId: string) {
    const statList = players.map((p) => ({
      player_id: p.id,
      matchday_id: matchdayId,
      vote: stats[p.id]?.vote ?? null,
      goals: stats[p.id]?.goals ?? 0,
      assists: stats[p.id]?.assists ?? 0,
      own_goals: stats[p.id]?.own_goals ?? 0,
      yellow_cards: stats[p.id]?.yellow_cards ?? 0,
      red_cards: stats[p.id]?.red_cards ?? 0,
      penalty_missed: stats[p.id]?.penalty_missed ?? 0,
      penalty_saved: stats[p.id]?.penalty_saved ?? 0,
      goals_conceded: stats[p.id]?.goals_conceded ?? 0,
      bonus_points: stats[p.id]?.bonus_points ?? 0,
      malus_points: stats[p.id]?.malus_points ?? 0,
    }));
    try {
      await savePlayerStats(statList);
      toast({ title: "Statistiche salvate!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
  }

  async function handleCalculate(matchdayId: string) {
    setIsCalculating(matchdayId);
    try {
      await calculateMatchdayResults(matchdayId);
      setMatchdays((prev) => prev.map((m) => m.id === matchdayId ? { ...m, status: "calculated" as const } : m));
      toast({ title: "Punteggi calcolati!", description: "I risultati sono stati aggiornati per tutti i team." });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore nel calcolo" });
    } finally {
      setIsCalculating(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMatchday(id);
      setMatchdays((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Giornata eliminata" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
  }

  function updateStat(playerId: string, field: keyof PlayerMatchStats, value: string) {
    const num = field === "vote" ? parseFloat(value) || null : parseInt(value) || 0;
    setStats((prev) => ({ ...prev, [playerId]: { ...prev[playerId], [field]: num } }));
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Calendar className="w-6 h-6 text-stork-orange" />
        <h1 className="text-2xl font-bold">Gestione Giornate</h1>
      </div>

      {/* Create new matchday */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuova Giornata
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="number"
              placeholder="N°"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              className="w-24"
            />
            <Input
              placeholder="Nome giornata (es. Giornata 1)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4" />
              Crea
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Matchdays list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {matchdays.map((matchday) => (
            <Card key={matchday.id} className={matchday.status === "calculated" ? "border-green-500/30" : ""}>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <CardTitle className="text-base truncate">{matchday.name}</CardTitle>
                    <Badge variant={matchday.status === "calculated" ? "success" : "warning"} className="shrink-0">
                      {matchday.status === "calculated" ? "Calcolata" : "Aperta"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === matchday.id ? null : matchday.id)}
                    >
                      {expandedId === matchday.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span className="hidden sm:inline">Statistiche</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          disabled={isCalculating === matchday.id}
                        >
                          <Calculator className="w-4 h-4" />
                          {isCalculating === matchday.id ? "Calcolo..." : "Calcola"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Calcolare i punteggi?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Verranno calcolati i punteggi per tutti i team basandosi sulle statistiche inserite. Assicurati che tutte le statistiche siano corrette prima di procedere.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleCalculate(matchday.id)}>
                            Calcola Punteggi
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminare {matchday.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tutti i dati della giornata saranno eliminati permanentemente. Se la giornata era già calcolata, i punti verranno rimossi automaticamente da tutti i team.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(matchday.id)} className="bg-destructive hover:bg-destructive/90">
                            Elimina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>

              {/* Stats table */}
              {expandedId === matchday.id && (
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stork-dark-border text-xs text-muted-foreground">
                          <th className="text-left py-2 pr-3 font-medium">Giocatore</th>
                          <th className="text-center py-2 px-2 font-medium">Voto</th>
                          <th className="text-center py-2 px-2 font-medium">Gol</th>
                          <th className="text-center py-2 px-2 font-medium">Ass</th>
                          <th className="text-center py-2 px-2 font-medium">AG</th>
                          <th className="text-center py-2 px-2 font-medium">Gio</th>
                          <th className="text-center py-2 px-2 font-medium">Esp</th>
                          <th className="text-center py-2 px-2 font-medium">Rig-</th>
                          <th className="text-center py-2 px-2 font-medium">RigP</th>
                          <th className="text-center py-2 px-2 font-medium">GolSub</th>
                          <th className="text-center py-2 px-2 font-medium text-emerald-400">Bonus</th>
                          <th className="text-center py-2 px-2 font-medium text-red-400">Malus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stork-dark-border">
                        {players.map((player) => (
                          <tr key={player.id} className="hover:bg-muted/50">
                            <td className="py-1.5 pr-3">
                              <p className="font-medium truncate max-w-[120px]">{player.name}</p>
                              <p className="text-xs text-muted-foreground">{player.team}</p>
                            </td>
                            {(["vote", "goals", "assists", "own_goals", "yellow_cards", "red_cards", "penalty_missed", "penalty_saved", "goals_conceded", "bonus_points", "malus_points"] as const).map((field) => (
                              <td key={field} className="px-1 py-1.5">
                                <Input
                                  type="number"
                                  step={field === "vote" ? "0.5" : "1"}
                                  min={0}
                                  max={field === "vote" ? 10 : 99}
                                  value={stats[player.id]?.[field] ?? ""}
                                  onChange={(e) => updateStat(player.id, field, e.target.value)}
                                  className="w-14 h-7 text-center text-xs px-1"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button onClick={() => handleSaveStats(matchday.id)} variant="outline" size="sm">
                      Salva Statistiche
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          {matchdays.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nessuna giornata creata</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
