"use client";

import { useEffect, useState } from "react";
import { Star, Plus, Trash2, TrendingUp, TrendingDown, Upload, Loader2 as Loader, FileJson, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getFantasyRules, upsertFantasyRule, deleteFantasyRule } from "@/lib/db/settings";
import { useLeagueStore } from "@/store/league";
import { DEFAULT_BONUS_RULES, DEFAULT_MALUS_RULES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import type { RuleEntry } from "@/types";

export function AdminRulesView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [rules, setRules] = useState<RuleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [showJsonPanel, setShowJsonPanel] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newPoints, setNewPoints] = useState("");
  const [newType, setNewType] = useState<"bonus" | "malus">("bonus");
  const { toast } = useToast();

  useEffect(() => {
    if (!leagueId) return;
    getFantasyRules(leagueId).then(setRules).finally(() => setIsLoading(false));
  }, [leagueId]);

  async function handleAdd() {
    if (!newLabel.trim() || !newPoints) return;
    const pts = parseFloat(newPoints);
    try {
      const rule = await upsertFantasyRule(leagueId, {
        key: newLabel.toLowerCase().replace(/\s+/g, "_"),
        label: newLabel.trim(),
        points: newType === "malus" ? -Math.abs(pts) : Math.abs(pts),
        type: newType,
      });
      setRules((prev) => [...prev, rule]);
      setNewLabel(""); setNewPoints("");
      toast({ title: "Regola aggiunta!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFantasyRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Regola eliminata" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
  }

  async function handleJsonImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setIsImporting(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const items: { label: string; points: number; type: "bonus" | "malus" }[] = Array.isArray(json) ? json : [json];
      const created: RuleEntry[] = [];
      for (const item of items) {
        if (!item.label || item.points === undefined || !item.type) continue;
        const r = await upsertFantasyRule(leagueId, {
          key: item.label.toLowerCase().replace(/\s+/g, "_"),
          label: item.label,
          points: item.type === "malus" ? -Math.abs(item.points) : Math.abs(item.points),
          type: item.type,
        });
        created.push(r);
      }
      setRules((prev) => [...prev, ...created]);
      toast({ title: `${created.length} regole importate!` });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore importazione", description: err instanceof Error ? err.message : "JSON non valido" });
    } finally {
      setIsImporting(false);
    }
  }

  async function handlePasteImport() {
    if (!jsonText.trim()) return;
    setIsImporting(true);
    try {
      const json = JSON.parse(jsonText);
      const items: { label: string; points: number; type: "bonus" | "malus" }[] = Array.isArray(json) ? json : [json];
      const created: RuleEntry[] = [];
      for (const item of items) {
        if (!item.label || item.points === undefined || !item.type) continue;
        const r = await upsertFantasyRule(leagueId, {
          key: item.label.toLowerCase().replace(/\s+/g, "_"),
          label: item.label,
          points: item.type === "malus" ? -Math.abs(item.points) : Math.abs(item.points),
          type: item.type,
        });
        created.push(r);
      }
      setRules((prev) => [...prev, ...created]);
      setJsonText("");
      setShowJsonPanel(false);
      toast({ title: `${created.length} regole importate!` });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "JSON non valido" });
    } finally {
      setIsImporting(false);
    }
  }

  async function handleLoadDefaults() {
    try {
      const all = [...DEFAULT_BONUS_RULES, ...DEFAULT_MALUS_RULES];
      const created = await Promise.all(all.map((r) => upsertFantasyRule(leagueId, r)));
      setRules(created);
      toast({ title: "Regole di default caricate!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
  }

  const bonuses = rules.filter((r) => r.type === "bonus");
  const maluses = rules.filter((r) => r.type === "malus");

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Star className="w-6 h-6 text-stork-orange" />
          <h1 className="text-2xl font-bold">Regole di Punteggio</h1>
        </div>
        <div className="flex items-center gap-2">
          {rules.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleLoadDefaults}>Carica Default</Button>
          )}
          <button
            onClick={() => setShowJsonPanel((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stork-dark-border bg-muted text-sm font-medium hover:border-stork-orange/40 hover:text-stork-orange transition-all"
          >
            <FileJson className="w-4 h-4" />
            Incolla JSON
            {showJsonPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <label className="cursor-pointer">
            <input type="file" accept=".json" className="hidden" onChange={handleJsonImport} disabled={isImporting} />
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stork-dark-border bg-muted text-sm font-medium hover:border-stork-orange/40 hover:text-stork-orange transition-all">
              {isImporting ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Importa File
            </div>
          </label>
        </div>
      </div>

      {/* JSON paste panel */}
      {showJsonPanel && (
        <Card className="border-stork-orange/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileJson className="w-4 h-4 text-stork-orange" /> Importa da JSON
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Formato atteso — array di oggetti:</p>
            <pre className="text-xs bg-stork-dark rounded-lg p-3 text-muted-foreground overflow-x-auto">{`[
  { "label": "Gol", "points": 3, "type": "bonus" },
  { "label": "Ammonizione", "points": 1, "type": "malus" }
]`}</pre>
            <textarea
              className="w-full h-36 bg-stork-dark border border-stork-dark-border rounded-lg p-3 text-sm text-foreground font-mono resize-none focus:outline-none focus:border-stork-orange/50"
              placeholder="Incolla il tuo JSON qui..."
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowJsonPanel(false); setJsonText(""); }}>Annulla</Button>
              <Button size="sm" onClick={handlePasteImport} disabled={isImporting || !jsonText.trim()}>
                {isImporting ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Importa
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add rule */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" /> Nuova Regola</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex rounded-lg bg-muted p-0.5">
              {(["bonus", "malus"] as const).map((t) => (
                <button key={t} onClick={() => setNewType(t)}
                  className={`px-3 py-1.5 text-sm rounded-md font-medium transition-all ${newType === t ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}>
                  {t === "bonus" ? "Bonus" : "Malus"}
                </button>
              ))}
            </div>
            <Input placeholder="Nome regola" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="flex-1" />
            <Input type="number" step="0.5" placeholder="Punti" value={newPoints} onChange={(e) => setNewPoints(e.target.value)} className="w-24" />
            <Button onClick={handleAdd}><Plus className="w-4 h-4" /> Aggiungi</Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" /> Bonus ({bonuses.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bonuses.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
                  <span className="text-sm">{r.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">+{r.points} pt</Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Eliminare &ldquo;{r.label}&rdquo;?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-destructive">Elimina</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
              {bonuses.length === 0 && <p className="text-sm text-muted-foreground">Nessun bonus</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-400" /> Malus ({maluses.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {maluses.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
                  <span className="text-sm">{r.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{r.points} pt</Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Eliminare &ldquo;{r.label}&rdquo;?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-destructive">Elimina</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
              {maluses.length === 0 && <p className="text-sm text-muted-foreground">Nessun malus</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
