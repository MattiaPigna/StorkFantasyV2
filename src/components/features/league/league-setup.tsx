"use client";

import { useState, useEffect } from "react";
import { Trophy, Users, Loader2, Plus, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getLeagueByInviteCode, joinLeague, createLeague } from "@/lib/db/leagues";
import { ensureProfile } from "@/app/actions/auth";
import { useLeagueStore } from "@/store/league";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Tab = "join" | "create";

export function LeagueSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) ?? "join";
  const [tab, setTab] = useState<Tab>(initialTab);

  const { setActiveLeague, setMyLeagues, myLeagues } = useLeagueStore();
  const { toast } = useToast();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    useLeagueStore.getState().reset();
    router.push("/");
    router.refresh();
  }

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      setIsAdmin(profile?.is_admin ?? false);
    }
    checkAdmin();
  }, []);

  async function handleJoin() {
    if (!inviteCode.trim()) {
      toast({ variant: "destructive", title: "Inserisci il codice invito" });
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      const league = await getLeagueByInviteCode(inviteCode.trim());
      if (!league) throw new Error("Codice invito non valido o lega non trovata");

      await ensureProfile();
      await joinLeague(league.id, user.id);
      setActiveLeague(league);
      setMyLeagues([...myLeagues, league]);
      toast({ title: `Benvenuto in ${league.name}!` });
      router.push("/league/onboarding");
      router.refresh();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    if (!leagueName.trim()) {
      toast({ variant: "destructive", title: "Inserisci il nome della lega" });
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      await ensureProfile();
      const league = await createLeague(leagueName.trim(), user.id);
      await joinLeague(league.id, user.id);
      setActiveLeague(league);
      setMyLeagues([...myLeagues, league]);
      toast({ title: `Lega "${league.name}" creata!`, description: `Codice invito: ${league.invite_code}` });
      router.push("/admin/matchdays");
      router.refresh();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-stork-orange/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
        <button
          onClick={() => router.push(myLeagues.length > 0 ? "/league/select" : "/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {myLeagues.length > 0 ? "Le mie leghe" : "Indietro"}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Esci
        </button>
      </div>

      <div className="w-full max-w-md space-y-6 animate-fade-in relative z-10">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-stork-orange to-stork-gold-dark flex items-center justify-center shadow-glow-orange mx-auto mb-4">
            <Trophy className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-2xl font-black text-gradient">
            {isAdmin ? "Gestisci la tua lega" : "Inizia a giocare"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? "Crea una nuova lega o unisciti a una esistente" : "Inserisci il codice invito per unirti alla lega"}
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-1 p-1 bg-stork-dark rounded-xl border border-stork-dark-border">
            <button
              onClick={() => setTab("join")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all",
                tab === "join"
                  ? "bg-gradient-to-r from-stork-orange to-stork-gold-dark text-black shadow-glow-orange"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-4 h-4" /> Unisciti
            </button>
            <button
              onClick={() => setTab("create")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all",
                tab === "create"
                  ? "bg-gradient-to-r from-stork-orange to-stork-gold-dark text-black shadow-glow-orange"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Plus className="w-4 h-4" /> Crea Lega
            </button>
          </div>
        )}

        {tab === "join" && (
          <Card className="border-stork-dark-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-stork-orange" />
                Unisciti alla lega
              </CardTitle>
              <CardDescription>Inserisci il codice invito che ti ha fornito il tuo admin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Codice Invito</label>
                <Input
                  placeholder="Es. AB3X7Y"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="text-center text-lg font-bold tracking-widest uppercase"
                  maxLength={10}
                />
              </div>
              <Button className="w-full" onClick={handleJoin} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                {isLoading ? "Accesso..." : "Entra nella lega"}
              </Button>
            </CardContent>
          </Card>
        )}

        {tab === "create" && (
          <Card className="border-stork-orange/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-stork-orange" />
                Crea una nuova lega
              </CardTitle>
              <CardDescription>Sarà generato automaticamente un codice invito da condividere</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome della Lega</label>
                <Input
                  placeholder="Es. Serie A Fantasy 2025"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  maxLength={50}
                />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isLoading ? "Creazione..." : "Crea Lega"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
