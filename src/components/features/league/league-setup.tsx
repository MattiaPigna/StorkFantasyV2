"use client";

import { useState } from "react";
import { Trophy, Plus, Users, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createLeague, getLeagueByInviteCode, joinLeague } from "@/lib/db/leagues";
import { useLeagueStore } from "@/store/league";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tab = "create" | "join";

export function LeagueSetup() {
  const [tab, setTab] = useState<Tab>("join");
  const [isLoading, setIsLoading] = useState(false);
  const [leagueName, setLeagueName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [createdLeague, setCreatedLeague] = useState<{ name: string; invite_code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { setActiveLeague, setMyLeagues, myLeagues } = useLeagueStore();
  const { toast } = useToast();
  const router = useRouter();

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

      const league = await createLeague(leagueName.trim(), user.id);
      setCreatedLeague({ name: league.name, invite_code: league.invite_code });
      setActiveLeague(league);
      setMyLeagues([...myLeagues, league]);
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setIsLoading(false);
    }
  }

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

      await joinLeague(league.id, user.id);
      setActiveLeague(league);
      setMyLeagues([...myLeagues, league]);
      toast({ title: `Benvenuto in ${league.name}!` });
      router.push("/dashboard/home");
      router.refresh();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setIsLoading(false);
    }
  }

  function handleCopy() {
    if (createdLeague) {
      navigator.clipboard.writeText(createdLeague.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleEnterLeague() {
    router.push("/dashboard/home");
    router.refresh();
  }

  if (createdLeague) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-stork-orange to-stork-gold-dark flex items-center justify-center shadow-glow-orange mx-auto">
            <Trophy className="w-8 h-8 text-black" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gradient">{createdLeague.name}</h2>
            <p className="text-muted-foreground mt-1">La tua lega è stata creata!</p>
          </div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">Codice invito per i tuoi partecipanti:</p>
              <div className="flex items-center gap-3 bg-stork-dark rounded-xl px-4 py-3 border border-stork-dark-border">
                <span className="text-2xl font-black text-gradient flex-1 tracking-widest">{createdLeague.invite_code}</span>
                <Button variant="ghost" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Condividi questo codice con chi vuoi invitare nella lega</p>
              <Button className="w-full" onClick={handleEnterLeague}>
                Entra nella lega
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-stork-orange/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 animate-fade-in relative z-10">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-stork-orange to-stork-gold-dark flex items-center justify-center shadow-glow-orange mx-auto mb-4">
            <Trophy className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-2xl font-black text-gradient">Inizia a giocare</h1>
          <p className="text-muted-foreground mt-1">Crea una nuova lega o unisciti con un codice</p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-stork-dark p-1 border border-stork-dark-border">
          {([
            { key: "join", label: "Unisciti", icon: Users },
            { key: "create", label: "Crea lega", icon: Plus },
          ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === key
                  ? "bg-gradient-to-r from-stork-orange to-stork-gold-dark text-black shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <Card className="border-stork-dark-border">
          {tab === "join" ? (
            <>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Unisciti a una lega</CardTitle>
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
            </>
          ) : (
            <>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Crea la tua lega</CardTitle>
                <CardDescription>Diventerai l&apos;amministratore della lega e potrai invitare i partecipanti</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nome della lega *</label>
                  <Input
                    placeholder="Es. Fantasy Serie A 2025"
                    value={leagueName}
                    onChange={(e) => setLeagueName(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isLoading ? "Creazione..." : "Crea lega"}
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
