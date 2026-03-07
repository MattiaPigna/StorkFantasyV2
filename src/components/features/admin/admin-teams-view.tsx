"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Trash2, Upload, FileJson, X, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getTournamentTeams, createTournamentTeam, createTournamentTeams,
  deleteTournamentTeam, deleteAllTournamentTeams, type TournamentTeam,
} from "@/lib/db/tournament-teams";
import { useLeagueStore } from "@/store/league";
import { useToast } from "@/hooks/use-toast";

const JSON_EXAMPLE = `["Juventus", "Inter", "Milan", "Roma", "Napoli", "Lazio"]`;

export function AdminTeamsView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";
  const { toast } = useToast();

  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!leagueId) return;
    getTournamentTeams(leagueId)
      .then(setTeams)
      .finally(() => setIsLoading(false));
  }, [leagueId]);

  async function handleAdd() {
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      const team = await createTournamentTeam(leagueId, newName.trim());
      setTeams((prev) => [...prev, team].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      toast({ title: "Squadra aggiunta!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTournamentTeam(id);
      setTeams((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Squadra rimossa" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
  }

  async function handleDeleteAll() {
    try {
      await deleteAllTournamentTeams(leagueId);
      setTeams([]);
      toast({ title: "Tutte le squadre eliminate" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
  }

  function parseTeamJson(text: string): string[] {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Il JSON deve essere un array");
    return parsed.map((item) => {
      if (typeof item === "string") return item.trim();
      if (typeof item === "object" && item !== null && "name" in item) return String(item.name).trim();
      throw new Error("Formato non valido. Usa [\"Squadra1\", \"Squadra2\"] oppure [{\"name\": \"Squadra1\"}]");
    }).filter(Boolean);
  }

  async function handleJsonImport() {
    if (!jsonText.trim()) return;
    setIsImporting(true);
    try {
      const names = parseTeamJson(jsonText);
      await createTournamentTeams(leagueId, names);
      const updated = await getTournamentTeams(leagueId);
      setTeams(updated);
      setJsonText("");
      setShowJson(false);
      toast({ title: `${names.length} squadre importate!` });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore JSON", description: err instanceof Error ? err.message : "Formato non valido" });
    } finally {
      setIsImporting(false);
    }
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonText(ev.target?.result as string);
      setShowJson(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-stork-orange" />
        <h1 className="text-2xl font-bold">Squadre del Torneo</h1>
      </div>

      {/* Aggiungi singola */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Aggiungi Squadra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Nome squadra (es. Juventus)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1"
            />
            <Button onClick={handleAdd} disabled={isSaving || !newName.trim()}>
              <Plus className="w-4 h-4" />
              Aggiungi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import JSON */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileJson className="w-4 h-4" /> Importa da JSON
          </CardTitle>
          <CardDescription>Importa più squadre in una volta sola</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowJson(!showJson)}>
              <FileJson className="w-4 h-4" /> Incolla JSON
            </Button>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span><Upload className="w-4 h-4" /> Carica file .json</span>
              </Button>
              <input type="file" accept=".json" className="hidden" onChange={handleFileImport} />
            </label>
          </div>

          {showJson && (
            <div className="space-y-3">
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={JSON_EXAMPLE}
                rows={5}
                className="w-full bg-stork-dark border border-stork-dark-border rounded-lg p-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-stork-orange/50 resize-none"
              />
              <div className="bg-stork-dark/60 border border-stork-dark-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground font-medium mb-1">Formato accettato:</p>
                <pre className="text-xs text-stork-orange font-mono">{JSON_EXAMPLE}</pre>
                <p className="text-xs text-muted-foreground mt-1">oppure: {`[{"name": "Juventus"}, {"name": "Inter"}]`}</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setShowJson(false); setJsonText(""); }}>
                  <X className="w-4 h-4" /> Annulla
                </Button>
                <Button size="sm" onClick={handleJsonImport} disabled={isImporting || !jsonText.trim()}>
                  {isImporting ? "Importazione..." : "Importa"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista squadre */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Squadre iscritte <span className="text-muted-foreground font-normal text-sm">({teams.length})</span>
              </CardTitle>
              {teams.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <AlertTriangle className="w-3.5 h-3.5" /> Elimina tutte
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminare tutte le squadre?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tutte le {teams.length} squadre verranno rimosse. Operazione irreversibile.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive hover:bg-destructive/90">
                        Elimina tutte
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {teams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nessuna squadra aggiunta</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {teams.map((team, i) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-stork-dark border border-stork-dark-border group hover:border-stork-orange/30 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-muted-foreground font-bold w-5 text-right shrink-0">{i + 1}</span>
                      <span className="font-medium text-sm">{team.name}</span>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rimuovere {team.name}?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(team.id)} className="bg-destructive hover:bg-destructive/90">
                            Rimuovi
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
