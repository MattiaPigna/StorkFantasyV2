"use client";

import { useState } from "react";
import { Trophy, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getLeagueByInviteCode, joinLeague } from "@/lib/db/leagues";
import { useLeagueStore } from "@/store/league";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LeagueSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  const { setActiveLeague, setMyLeagues, myLeagues } = useLeagueStore();
  const { toast } = useToast();
  const router = useRouter();

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-stork-orange/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 animate-fade-in relative z-10">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-stork-orange to-stork-gold-dark flex items-center justify-center shadow-glow-orange mx-auto mb-4">
            <Trophy className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-2xl font-black text-gradient">Inizia a giocare</h1>
          <p className="text-muted-foreground mt-1">Inserisci il codice invito per unirti alla lega</p>
        </div>

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
      </div>
    </div>
  );
}
