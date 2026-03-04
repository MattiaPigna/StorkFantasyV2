"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getAppSettings, updateAppSettings } from "@/lib/db/settings";
import { useToast } from "@/hooks/use-toast";
import type { AppSettings } from "@/types";
import { createClient } from "@/lib/supabase/client";

export function AdminSettingsView() {
  const [settings, setSettings] = useState<Partial<AppSettings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getAppSettings().then((s) => {
      if (s) setSettings(s);
    }).finally(() => setIsLoading(false));
  }, []);

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateAppSettings(settings);
      toast({ title: "Impostazioni salvate!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetLeague() {
    try {
      const supabase = createClient();
      // Reset all team points via RPC
      const { error } = await supabase.rpc("reset_all_standings");
      if (error) throw error;
      toast({ title: "Lega resettata!", description: "Tutti i punteggi sono stati azzerati." });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore nel reset" });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-stork-orange" />
          <h1 className="text-2xl font-bold">Impostazioni</h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "Salvataggio..." : "Salva"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Market & Lineup */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Mercato & Formazione</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium">Mercato Aperto</p>
                <p className="text-xs text-muted-foreground">Permetti acquisti e vendite</p>
              </div>
              <div
                onClick={() => setSettings((prev) => ({ ...prev, market_open: !prev.market_open }))}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${settings.market_open ? "bg-stork-orange" : "bg-muted"}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.market_open ? "left-6" : "left-1"}`} />
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium">Formazione Bloccata</p>
                <p className="text-xs text-muted-foreground">Impedisci modifiche alla formazione</p>
              </div>
              <div
                onClick={() => setSettings((prev) => ({ ...prev, lineup_locked: !prev.lineup_locked }))}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${settings.lineup_locked ? "bg-stork-orange" : "bg-muted"}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.lineup_locked ? "left-6" : "left-1"}`} />
              </div>
            </label>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Scadenza Mercato</label>
              <Input
                type="datetime-local"
                value={settings.market_deadline?.slice(0, 16) ?? ""}
                onChange={(e) => setSettings((prev) => ({ ...prev, market_deadline: e.target.value || null }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Crediti Iniziali</label>
              <Input
                type="number"
                value={settings.initial_credits ?? 250}
                onChange={(e) => setSettings((prev) => ({ ...prev, initial_credits: parseInt(e.target.value) || 250 }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contenuti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Link YouTube Live</label>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={settings.youtube_url ?? ""}
                onChange={(e) => setSettings((prev) => ({ ...prev, youtube_url: e.target.value || null }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Testo Banner (Marquee)</label>
              <Input
                placeholder="Annuncio da mostrare nella barra..."
                value={settings.marquee_text ?? ""}
                onChange={(e) => setSettings((prev) => ({ ...prev, marquee_text: e.target.value || null }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/30 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              Zona Pericolosa
            </CardTitle>
            <CardDescription>Azioni irreversibili — usa con cautela</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Reset Completo Lega
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Conferma Reset Lega</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tutti i punteggi di tutti i team verranno azzerati. Le rose e i crediti NON verranno modificati. Questa operazione è irreversibile.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetLeague} className="bg-destructive hover:bg-destructive/90">
                    Sì, azzerai i punteggi
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
