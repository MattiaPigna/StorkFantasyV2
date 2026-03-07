"use client";

import { useEffect, useState } from "react";
import { CreditCard, Plus, Trash2, Upload, FileJson, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getSpecialCards, upsertSpecialCard, deleteSpecialCard } from "@/lib/db/settings";
import { useLeagueStore } from "@/store/league";
import { useToast } from "@/hooks/use-toast";
import type { SpecialCard } from "@/types";

export function AdminCardsView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [cards, setCards] = useState<SpecialCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [showJsonPanel, setShowJsonPanel] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [form, setForm] = useState({ name: "", description: "", effect: "", image_url: "" });
  const { toast } = useToast();

  useEffect(() => {
    if (!leagueId) return;
    getSpecialCards(leagueId).then(setCards).finally(() => setIsLoading(false));
  }, [leagueId]);

  async function handleAdd() {
    if (!form.name.trim() || !form.description.trim()) {
      toast({ variant: "destructive", title: "Nome e descrizione sono obbligatori" });
      return;
    }
    try {
      const card = await upsertSpecialCard(leagueId, {
        name: form.name.trim(),
        description: form.description.trim(),
        effect: form.effect.trim() || null,
        image_url: form.image_url.trim() || null,
      });
      setCards((prev) => [...prev, card]);
      setForm({ name: "", description: "", effect: "", image_url: "" });
      toast({ title: "Card aggiunta!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSpecialCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Card eliminata" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
  }

  async function importCards(items: { name: string; description: string; effect?: string; image_url?: string }[]) {
    const created: SpecialCard[] = [];
    for (const item of items) {
      if (!item.name?.trim() || !item.description?.trim()) continue;
      const card = await upsertSpecialCard(leagueId, {
        name: item.name.trim(),
        description: item.description.trim(),
        effect: item.effect?.trim() || null,
        image_url: item.image_url?.trim() || null,
      });
      created.push(card);
    }
    return created;
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setIsImporting(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const items = Array.isArray(json) ? json : [json];
      const created = await importCards(items);
      setCards((prev) => [...prev, ...created]);
      toast({ title: `${created.length} card importate!` });
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
      const items = Array.isArray(json) ? json : [json];
      const created = await importCards(items);
      setCards((prev) => [...prev, ...created]);
      setJsonText("");
      setShowJsonPanel(false);
      toast({ title: `${created.length} card importate!` });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "JSON non valido" });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-stork-orange" />
          <h1 className="text-2xl font-bold">Card Speciali</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJsonPanel((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stork-dark-border bg-muted text-sm font-medium hover:border-stork-orange/40 hover:text-stork-orange transition-all"
          >
            <FileJson className="w-4 h-4" />
            Incolla JSON
            {showJsonPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <label className="cursor-pointer">
            <input type="file" accept=".json" className="hidden" onChange={handleFileImport} disabled={isImporting} />
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stork-dark-border bg-muted text-sm font-medium hover:border-stork-orange/40 hover:text-stork-orange transition-all">
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
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
            <p className="text-xs text-muted-foreground">
              Formato atteso — array di oggetti:
            </p>
            <pre className="text-xs bg-stork-dark rounded-lg p-3 text-muted-foreground overflow-x-auto">{`[
  {
    "name": "Capitano",
    "description": "Raddoppia i punti del capitano",
    "effect": "x2 punti capitano",
    "image_url": "https://..."
  }
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
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Importa
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" /> Nuova Card</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Nome</label><Input placeholder="Nome card" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Effetto</label><Input placeholder="Descrizione effetto" value={form.effect} onChange={(e) => setForm((p) => ({ ...p, effect: e.target.value }))} /></div>
          </div>
          <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Descrizione</label><Input placeholder="Descrizione della card" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">URL Immagine</label><Input placeholder="https://..." value={form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} /></div>
          <div className="flex justify-end"><Button onClick={handleAdd}><Plus className="w-4 h-4" /> Aggiungi Card</Button></div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Card key={card.id} className="hover:border-stork-orange/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{card.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                    {card.effect && <p className="text-xs text-stork-orange mt-1">Effetto: {card.effect}</p>}
                    {card.image_url && <p className="text-xs text-muted-foreground mt-1 truncate">{card.image_url}</p>}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminare &ldquo;{card.name}&rdquo;?</AlertDialogTitle>
                        <AlertDialogDescription>Questa azione non può essere annullata.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(card.id)} className="bg-destructive">Elimina</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
          {cards.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nessuna card creata</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
