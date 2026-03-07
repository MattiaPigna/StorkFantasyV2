"use client";

import { useEffect, useState } from "react";
import { Swords, Plus, Trash2, Clock, Trophy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getDailyMatches, createDailyMatch, deleteDailyMatch, updateMatchScore, type DailyMatch } from "@/lib/db/matches";
import { getTournamentTeams, type TournamentTeam } from "@/lib/db/tournament-teams";
import { useLeagueStore } from "@/store/league";
import { useToast } from "@/hooks/use-toast";

function groupByDate(matches: DailyMatch[]): { label: string; matches: DailyMatch[] }[] {
  const map = new Map<string, { label: string; ts: number; matches: DailyMatch[] }>();
  for (const m of matches) {
    const d = new Date(m.match_datetime);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString();
    const label = d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (!map.has(key)) map.set(key, { label, ts: d.getTime(), matches: [] });
    map.get(key)!.matches.push(m);
  }
  return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
}

export function AdminMatchesView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";
  const { toast } = useToast();

  const [matches, setMatches] = useState<DailyMatch[]>([]);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [matchDatetime, setMatchDatetime] = useState("");
  const [competition, setCompetition] = useState("Serie A");
  const [isSaving, setIsSaving] = useState(false);

  // Score editing state: matchId -> { home, away }
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({});
  const [savingScore, setSavingScore] = useState<string | null>(null);

  useEffect(() => {
    if (!leagueId) return;
    getTournamentTeams(leagueId).then(setTeams);
    getDailyMatches(leagueId)
      .then((m) => {
        setMatches(m);
        // Pre-fill scores from existing data
        const initial: Record<string, { home: string; away: string }> = {};
        for (const match of m) {
          initial[match.id] = {
            home: match.home_score !== null ? String(match.home_score) : "",
            away: match.away_score !== null ? String(match.away_score) : "",
          };
        }
        setScores(initial);
      })
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
        match_datetime: new Date(matchDatetime).toISOString(),
        competition: competition.trim() || "Serie A",
      });
      setMatches((prev) => [...prev, match].sort(
        (a, b) => new Date(a.match_datetime).getTime() - new Date(b.match_datetime).getTime()
      ));
      setScores((prev) => ({ ...prev, [match.id]: { home: "", away: "" } }));
      setHomeTeam(""); setAwayTeam(""); setMatchDatetime(""); setCompetition("Serie A");
      toast({ title: "Partita aggiunta!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveScore(match: DailyMatch) {
    const s = scores[match.id];
    const home = s?.home !== "" ? parseInt(s.home) : null;
    const away = s?.away !== "" ? parseInt(s.away) : null;
    setSavingScore(match.id);
    try {
      await updateMatchScore(match.id, home, away);
      setMatches((prev) => prev.map((m) => m.id === match.id ? { ...m, home_score: home, away_score: away } : m));
      toast({ title: "Risultato salvato!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setSavingScore(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDailyMatch(id);
      setMatches((prev) => prev.filter((m) => m.id !== id));
      setScores((prev) => { const n = { ...prev }; delete n[id]; return n; });
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
        <h1 className="text-2xl font-bold">Partite</h1>
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
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Squadra Casa *</label>
              <select
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-stork-dark-border bg-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stork-orange/50"
              >
                <option value="">— Seleziona —</option>
                {teams.filter((t) => t.name !== awayTeam).map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Squadra Ospite *</label>
              <select
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-stork-dark-border bg-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stork-orange/50"
              >
                <option value="">— Seleziona —</option>
                {teams.filter((t) => t.name !== homeTeam).map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data e Ora *</label>
              <Input type="datetime-local" value={matchDatetime} onChange={(e) => setMatchDatetime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Competizione</label>
              <Input placeholder="Serie A" value={competition} onChange={(e) => setCompetition(e.target.value)} />
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

      {/* Lista partite */}
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
        <div className="space-y-6">
          {grouped.map(({ label, matches: dayMatches }) => (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1 capitalize">{label}</p>
              <div className="space-y-2">
                {dayMatches.map((match) => {
                  const time = new Date(match.match_datetime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
                  const hasResult = match.home_score !== null && match.away_score !== null;
                  const s = scores[match.id] ?? { home: "", away: "" };

                  const homeWins = hasResult && match.home_score! > match.away_score!;
                  const awayWins = hasResult && match.away_score! > match.home_score!;
                  const isDraw = hasResult && match.home_score === match.away_score;

                  return (
                    <Card key={match.id} className={hasResult ? "border-emerald-500/40 bg-emerald-500/5" : "border-stork-dark-border"}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                          {/* Orario + competizione */}
                          <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-1 sm:min-w-[64px]">
                            <div className="flex items-center gap-1 text-stork-orange">
                              <Clock className="w-3 h-3" />
                              <span className="text-sm font-bold">{time}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{match.competition}</span>
                          </div>

                          {/* Partita */}
                          <div className="flex-1 flex items-center justify-center gap-3">
                            <span className={`font-semibold text-sm flex-1 text-right ${homeWins ? "text-emerald-400 font-black" : awayWins ? "text-red-400" : isDraw ? "text-yellow-400" : ""}`}>
                              {match.home_team}
                            </span>
                            {hasResult ? (
                              <span className="text-xl font-black text-foreground shrink-0 px-2">
                                {match.home_score} – {match.away_score}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground font-bold shrink-0 px-2">VS</span>
                            )}
                            <span className={`font-semibold text-sm flex-1 ${awayWins ? "text-emerald-400 font-black" : homeWins ? "text-red-400" : isDraw ? "text-yellow-400" : ""}`}>
                              {match.away_team}
                            </span>
                          </div>

                          {/* Input risultato */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Input
                              type="number"
                              min={0}
                              max={99}
                              placeholder="–"
                              value={s.home}
                              onChange={(e) => setScores((prev) => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value } }))}
                              className="w-14 h-8 text-center text-sm font-bold px-1"
                            />
                            <span className="text-muted-foreground font-bold">:</span>
                            <Input
                              type="number"
                              min={0}
                              max={99}
                              placeholder="–"
                              value={s.away}
                              onChange={(e) => setScores((prev) => ({ ...prev, [match.id]: { ...prev[match.id], away: e.target.value } }))}
                              className="w-14 h-8 text-center text-sm font-bold px-1"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveScore(match)}
                              disabled={savingScore === match.id}
                              className={`h-8 px-2 ${hasResult ? "bg-emerald-600 hover:bg-emerald-700 text-white border-0" : ""}`}
                            >
                              {savingScore === match.id ? (
                                <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="w-3.5 h-3.5" />
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
                          </div>
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
    </div>
  );
}
