"use client";

import { useEffect, useState } from "react";
import { Star, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getFantasyRules, upsertFantasyRule, deleteFantasyRule } from "@/lib/db/settings";
import { DEFAULT_BONUS_RULES, DEFAULT_MALUS_RULES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import type { RuleEntry } from "@/types";

export function AdminRulesView() {
  const [rules, setRules] = useState<RuleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [newPoints, setNewPoints] = useState("");
  const [newType, setNewType] = useState<"bonus" | "malus">("bonus");
  const { toast } = useToast();

  useEffect(() => {
    getFantasyRules().then(setRules).finally(() => setIsLoading(false));
  }, []);

  async function handleAdd() {
    if (!newLabel.trim() || !newPoints) return;
    const pts = parseFloat(newPoints);
    try {
      const rule = await upsertFantasyRule({
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

  async function handleLoadDefaults() {
    try {
      const all = [...DEFAULT_BONUS_RULES, ...DEFAULT_MALUS_RULES];
      const created = await Promise.all(all.map((r) => upsertFantasyRule(r)));
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
        {rules.length === 0 && (
          <Button variant="outline" size="sm" onClick={handleLoadDefaults}>Carica Default</Button>
        )}
      </div>

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
