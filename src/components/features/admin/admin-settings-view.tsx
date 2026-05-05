"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Loader2, AlertTriangle, Users, LayoutGrid, Coins, Lock, ShoppingCart, Tv, Megaphone, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getAppSettings, updateAppSettings } from "@/lib/db/settings";
import { deleteLeague } from "@/lib/db/leagues";
import { useLeagueStore } from "@/store/league";
import { useToast } from "@/hooks/use-toast";
import type { AppSettings } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

function Toggle({ value, onChange, label, description }: {
  value: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <div>
        <p className="text-sm font-medium text-foreground group-hover:text-stork-orange transition-colors">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-all cursor-pointer ${value ? "bg-gradient-to-r from-stork-orange to-stork-gold-dark shadow-glow-orange" : "bg-stork-dark border border-stork-dark-border"}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full transition-all shadow ${value ? "left-7 bg-black" : "left-1 bg-muted-foreground"}`} />
      </div>
    </label>
  );
}

function NumberInput({ label, description, value, onChange, min, max, icon: Icon }: {
  label: string; description?: string; value: number; onChange: (v: number) => void;
  min: number; max: number; icon?: React.ElementType;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-stork-orange" />}
        {label}
      </label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, value - 1))}
          className="w-9 h-9 rounded-lg bg-stork-dark border border-stork-dark-border text-foreground hover:border-stork-orange/40 hover:text-stork-orange transition-all font-bold text-lg flex items-center justify-center">
          −
        </button>
        <Input type="number" min={min} max={max} value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || min)))}
          className="w-20 text-center font-bold text-lg" />
        <button onClick={() => onChange(Math.min(max, value + 1))}
          className="w-9 h-9 rounded-lg bg-stork-dark border border-stork-dark-border text-foreground hover:border-stork-orange/40 hover:text-stork-orange transition-all font-bold text-lg flex items-center justify-center">
          +
        </button>
        <span className="text-xs text-muted-foreground ml-1">({min}–{max})</span>
      </div>
    </div>
  );
}

export function AdminSettingsView() {
  const { activeLeague, setAppSettings } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [settings, setSettings] = useState<Partial<AppSettings>>({
    market_open: true,
    lineup_locked: false,
    max_players_per_team: 15,
    lineup_size: 11,
    initial_credits: 250,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!leagueId) return;
    getAppSettings(leagueId).then((s) => {
      if (!s) return;
      // Auto-close market if the deadline has already passed
      if (s.market_open && s.market_deadline && new Date(s.market_deadline) < new Date()) {
        const patched = { ...s, market_open: false };
        setSettings(patched);
        updateAppSettings(leagueId, { market_open: false }).catch(() => null);
      } else {
        setSettings(s);
      }
    }).finally(() => setIsLoading(false));
  }, [leagueId]);

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateAppSettings(leagueId, settings);
      setAppSettings(settings as AppSettings);
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
      const { error } = await supabase.rpc("reset_league_standings", { p_league_id: leagueId });
      if (error) throw error;
      toast({ title: "Lega resettata!", description: "Tutti i punteggi sono stati azzerati." });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore nel reset" });
    }
  }

  function handleCopyCode() {
    if (!activeLeague?.invite_code) return;
    navigator.clipboard.writeText(activeLeague.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDeleteLeague() {
    try {
      await deleteLeague(leagueId);
      useLeagueStore.getState().reset();
      toast({ title: "Lega eliminata" });
      router.push("/league/setup");
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-3">
            <Settings className="w-6 h-6 text-stork-orange" />
            Impostazioni Lega
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Configura le regole della tua lega</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "Salvataggio..." : "Salva Tutto"}
        </Button>
      </div>

      {/* Invite code */}
      {activeLeague?.invite_code && (
        <Card className="border-stork-orange/20">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Codice Invito Lega</p>
              <p className="text-2xl font-black tracking-widest text-stork-orange">{activeLeague.invite_code}</p>
              <p className="text-xs text-muted-foreground mt-1">Condividi questo codice per far entrare i membri</p>
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-stork-orange/30 bg-stork-orange/10 text-stork-orange text-sm font-medium hover:bg-stork-orange/20 transition-all shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiato!" : "Copia"}
            </button>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-5">

        {/* Squadra & Formazione */}
        <Card className="border-stork-orange/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-stork-orange/15 flex items-center justify-center">
                <Users className="w-4 h-4 text-stork-orange" />
              </div>
              Squadra & Formazione
            </CardTitle>
            <CardDescription>Configura la dimensione della rosa e della formazione</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <NumberInput
              icon={Users}
              label="Max Giocatori per Squadra"
              description="Numero massimo di giocatori acquistabili da ogni utente"
              value={settings.max_players_per_team ?? 15}
              onChange={(v) => setSettings((p) => ({ ...p, max_players_per_team: v }))}
              min={5} max={30}
            />
            <NumberInput
              icon={LayoutGrid}
              label="Dimensione Formazione"
              description="Numero di giocatori titolari da schierare"
              value={settings.lineup_size ?? 11}
              onChange={(v) => setSettings((p) => ({ ...p, lineup_size: v }))}
              min={3} max={15}
            />
            <NumberInput
              icon={Coins}
              label="Crediti Iniziali (SK)"
              description="Budget assegnato a ogni nuovo iscritto"
              value={settings.initial_credits ?? 250}
              onChange={(v) => setSettings((p) => ({ ...p, initial_credits: v }))}
              min={50} max={1000}
            />
          </CardContent>
        </Card>

        {/* Stato Lega */}
        <Card className="border-stork-gold/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-stork-gold/15 flex items-center justify-center">
                <Lock className="w-4 h-4 text-stork-gold" />
              </div>
              Stato Lega
            </CardTitle>
            <CardDescription>Controlla apertura mercato e blocco formazioni</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Toggle
              value={settings.market_open ?? true}
              onChange={(v) => setSettings((p) => ({ ...p, market_open: v }))}
              label="Mercato Aperto"
              description="Permetti acquisti e vendite di giocatori"
            />
            <div className="border-t border-stork-dark-border" />
            <Toggle
              value={settings.lineup_locked ?? false}
              onChange={(v) => setSettings((p) => ({ ...p, lineup_locked: v }))}
              label="Formazione Bloccata"
              description="Impedisci modifiche alla formazione (es. durante la giornata)"
            />
            <div className="border-t border-stork-dark-border" />
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart className="w-3.5 h-3.5 text-stork-orange" />
                Scadenza Mercato
              </label>
              <Input
                type="datetime-local"
                value={settings.market_deadline?.slice(0, 16) ?? ""}
                onChange={(e) => setSettings((p) => ({ ...p, market_deadline: e.target.value || null }))}
              />
              <p className="text-xs text-muted-foreground">Lascia vuoto per nessuna scadenza automatica</p>
            </div>
          </CardContent>
        </Card>

        {/* Contenuti */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-blue-400" />
              </div>
              Contenuti & Media
            </CardTitle>
            <CardDescription>Gestisci lo stream live e i messaggi per gli utenti</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-2">
                <Tv className="w-3.5 h-3.5 text-red-400" />
                Link YouTube Live
              </label>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={settings.youtube_url ?? ""}
                onChange={(e) => setSettings((p) => ({ ...p, youtube_url: e.target.value || null }))}
              />
              <p className="text-xs text-muted-foreground">Visibile nella Home degli utenti</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-2">
                <Megaphone className="w-3.5 h-3.5 text-stork-orange" />
                Banner Annunci (Marquee)
              </label>
              <Input
                placeholder="Es: Giornata 5 aperta! Inserisci la formazione..."
                value={settings.marquee_text ?? ""}
                onChange={(e) => setSettings((p) => ({ ...p, marquee_text: e.target.value || null }))}
              />
              <p className="text-xs text-muted-foreground">Scorre in cima alla pagina. Lascia vuoto per nasconderlo</p>
            </div>
          </CardContent>
        </Card>

        {/* Zona pericolosa */}
        <Card className="border-red-500/30 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" /> Zona Pericolosa
            </CardTitle>
            <CardDescription>Azioni irreversibili — procedi con cautela</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">Azzera Tutti i Punteggi</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confermi il reset della lega?</AlertDialogTitle>
                  <AlertDialogDescription>
                    I punteggi di <strong>tutti i team</strong> verranno azzerati. Rose e crediti non vengono modificati. Operazione irreversibile.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetLeague} className="bg-destructive hover:bg-destructive/90">
                    Sì, azzera tutto
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">Elimina Lega</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminare la lega &ldquo;{activeLeague?.name}&rdquo;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Verranno eliminati <strong>tutti i dati</strong>: giocatori, giornate, formazioni, classifica, regole e tutti i membri. Operazione <strong>irreversibile</strong>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteLeague} className="bg-destructive hover:bg-destructive/90">
                    Sì, elimina tutto
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
