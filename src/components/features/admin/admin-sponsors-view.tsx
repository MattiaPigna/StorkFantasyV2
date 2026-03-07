"use client";

import { useEffect, useState } from "react";
import { Building, Plus, Trash2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getAllSponsors, upsertSponsor, deleteSponsor } from "@/lib/db/settings";
import { useLeagueStore } from "@/store/league";
import { SPONSOR_TYPE_LABELS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import type { Sponsor } from "@/types";

type SponsorType = "main" | "partner" | "technical";

export function AdminSponsorsView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ name: "", logo_url: "", website_url: "", type: "partner" as SponsorType });
  const { toast } = useToast();

  useEffect(() => {
    if (!leagueId) return;
    getAllSponsors(leagueId).then(setSponsors).finally(() => setIsLoading(false));
  }, [leagueId]);

  async function handleAdd() {
    if (!form.name.trim()) { toast({ variant: "destructive", title: "Il nome è obbligatorio" }); return; }
    try {
      const sponsor = await upsertSponsor(leagueId, { ...form, logo_url: form.logo_url || null, website_url: form.website_url || null, is_active: true });
      setSponsors((prev) => [...prev, sponsor]);
      setForm({ name: "", logo_url: "", website_url: "", type: "partner" });
      toast({ title: "Sponsor aggiunto!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSponsor(id);
      setSponsors((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Sponsor eliminato" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Building className="w-6 h-6 text-stork-orange" />
        <h1 className="text-2xl font-bold">Sponsor</h1>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" /> Aggiungi Sponsor</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Nome *</label><Input placeholder="Nome sponsor" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as SponsorType }))}
                className="flex h-10 w-full rounded-lg border border-stork-dark-border bg-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stork-orange/50">
                {Object.entries(SPONSOR_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">URL Logo</label><Input placeholder="https://..." value={form.logo_url} onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))} /></div>
          <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Sito Web</label><Input placeholder="https://..." value={form.website_url} onChange={(e) => setForm((p) => ({ ...p, website_url: e.target.value }))} /></div>
          <div className="flex justify-end"><Button onClick={handleAdd}><Plus className="w-4 h-4" /> Aggiungi</Button></div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sponsors.map((s) => (
            <Card key={s.id} className="hover:border-stork-orange/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{s.name}</p>
                      <Badge variant="outline" className="text-xs">{SPONSOR_TYPE_LABELS[s.type]}</Badge>
                    </div>
                    {s.website_url && (
                      <a href={s.website_url.startsWith("http") ? s.website_url : `https://${s.website_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-stork-orange hover:underline">
                        <ExternalLink className="w-3 h-3" /> Sito web
                      </a>
                    )}
                    {s.logo_url && <p className="text-xs text-muted-foreground mt-1 truncate">{s.logo_url}</p>}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminare {s.name}?</AlertDialogTitle>
                        <AlertDialogDescription>Questa azione non può essere annullata.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive">Elimina</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
          {sponsors.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Building className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nessuno sponsor aggiunto</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
