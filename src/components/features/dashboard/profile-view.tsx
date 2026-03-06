"use client";

import { useEffect, useState } from "react";
import { User, Save, Loader2, Camera, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { getProfile, updateProfile } from "@/lib/db/teams";
import { leaveLeague } from "@/lib/db/leagues";
import { useLeagueStore } from "@/store/league";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { getInitials } from "@/lib/utils";
import type { Profile } from "@/types";

export function ProfileView() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ team_name: "", manager_name: "", avatar_url: "" });
  const { toast } = useToast();
  const { activeLeague, reset } = useLeagueStore();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const prof = await getProfile(user.id);
      if (prof) {
        setProfile(prof);
        setForm({
          team_name: prof.team_name,
          manager_name: prof.manager_name,
          avatar_url: prof.avatar_url ?? "",
        });
      }
      setIsLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!profile) return;
    if (!form.team_name.trim() || !form.manager_name.trim()) {
      toast({ variant: "destructive", title: "Compila tutti i campi obbligatori" });
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile(profile.id, {
        team_name: form.team_name.trim(),
        manager_name: form.manager_name.trim(),
        avatar_url: form.avatar_url.trim() || undefined,
      });
      setProfile((prev) => prev ? { ...prev, ...form } : prev);
      toast({ title: "Profilo aggiornato!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLeaveLeague() {
    if (!profile || !activeLeague) return;
    if (activeLeague.owner_id === profile.id) {
      toast({ variant: "destructive", title: "Non puoi uscire", description: "Sei il proprietario della lega. Eliminala dalle impostazioni admin." });
      return;
    }
    try {
      await leaveLeague(activeLeague.id, profile.id);
      reset();
      toast({ title: "Hai lasciato la lega" });
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
    <div className="p-4 lg:p-8 max-w-xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <User className="w-6 h-6 text-stork-orange" />
        <h1 className="text-2xl font-black">Il mio Profilo</h1>
      </div>

      {/* Avatar preview */}
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="relative">
          {form.avatar_url ? (
            <img
              src={form.avatar_url}
              alt={form.manager_name}
              className="w-24 h-24 rounded-full object-cover border-2 border-stork-orange/40"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-stork-orange to-stork-gold-dark flex items-center justify-center text-black text-2xl font-black border-2 border-stork-orange/40">
              {getInitials(form.team_name || "?")}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-stork-dark-card border border-stork-dark-border rounded-full flex items-center justify-center">
            <Camera className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-black text-lg text-gradient">{form.team_name || "—"}</p>
          <p className="text-sm text-muted-foreground">{form.manager_name || "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{profile?.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Modifica Profilo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nome Allenatore *</label>
            <Input
              placeholder="Mario Rossi"
              value={form.manager_name}
              onChange={(e) => setForm((p) => ({ ...p, manager_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nome Squadra *</label>
            <Input
              placeholder="FC Campioni"
              value={form.team_name}
              onChange={(e) => setForm((p) => ({ ...p, team_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">URL Avatar <span className="text-muted-foreground font-normal">(opzionale)</span></label>
            <Input
              placeholder="https://..."
              value={form.avatar_url}
              onChange={(e) => setForm((p) => ({ ...p, avatar_url: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Inserisci il link a un&apos;immagine online</p>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Salvataggio..." : "Salva modifiche"}
          </Button>
        </CardContent>
      </Card>

      {activeLeague && activeLeague.owner_id !== profile?.id && (
        <Card className="border-red-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-400 flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Lascia Lega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Lasciando la lega <span className="text-foreground font-medium">{activeLeague.name}</span> perderai la tua squadra e tutti i progressi accumulati.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">Lascia la lega</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Lasciare &ldquo;{activeLeague.name}&rdquo;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Perderai tutta la tua rosa, i crediti e i punteggi in questa lega. Non potrai recuperarli.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeaveLeague} className="bg-destructive">
                    Sì, lascia la lega
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
