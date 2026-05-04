"use client";

import { useState, useEffect } from "react";
import { Trophy, Users, Plus, LogOut, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyLeagues } from "@/lib/db/leagues";
import { useLeagueStore } from "@/store/league";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { League } from "@/types";

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "249, 115, 22";
  return `${r}, ${g}, ${b}`;
}

export function LeagueSelect() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { setActiveLeague, setMyLeagues } = useLeagueStore();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      const [userLeagues, profileResult] = await Promise.all([
        getMyLeagues(user.id),
        supabase.from("profiles").select("is_admin").eq("id", user.id).single(),
      ]);

      setLeagues(userLeagues);
      setMyLeagues(userLeagues);
      setIsAdmin(profileResult.data?.is_admin ?? false);
      setIsLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectLeague(league: League) {
    setActiveLeague(league);
    router.push("/dashboard/home");
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    useLeagueStore.getState().reset();
    router.push("/");
    router.refresh();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-stork-orange" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-stork-orange/5 rounded-full blur-3xl pointer-events-none" />

      <div className="fixed top-0 left-0 right-0 flex items-center justify-end px-4 py-3 z-10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Esci
        </button>
      </div>

      <div className="w-full max-w-lg space-y-6 animate-fade-in relative z-10">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-stork-orange to-stork-gold-dark flex items-center justify-center shadow-glow-orange mx-auto mb-4">
            <Trophy className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-2xl font-black text-gradient">Scegli la tua lega</h1>
          <p className="text-muted-foreground mt-1">
            {leagues.length > 0
              ? "Seleziona la lega in cui vuoi entrare"
              : "Non sei ancora in nessuna lega"}
          </p>
        </div>

        {leagues.length > 0 && (
          <div className="space-y-3">
            {leagues.map((league) => {
              const color = league.primary_color ?? "#F97316";
              const rgb = hexToRgb(color);
              return (
                <button
                  key={league.id}
                  onClick={() => handleSelectLeague(league)}
                  className="w-full group flex items-center gap-4 p-4 rounded-xl border border-stork-dark-border bg-stork-dark-card hover:border-stork-orange/50 hover:bg-stork-dark transition-all text-left"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ background: color, boxShadow: `0 0 20px rgba(${rgb}, 0.35)` }}
                  >
                    {league.logo_url
                      ? <img src={league.logo_url} alt={league.name} className="w-full h-full object-cover" />
                      : <Trophy className="w-5 h-5 text-black" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color }}>{league.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Codice: {league.invite_code}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        <div className="space-y-2 pt-2">
          <Button
            variant="outline"
            className="w-full border-stork-dark-border hover:border-stork-orange/50"
            onClick={() => router.push("/league/setup")}
          >
            <Users className="w-4 h-4" />
            Unisciti a una nuova lega
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              className="w-full border-stork-orange/30 text-stork-orange hover:bg-stork-orange/10"
              onClick={() => router.push("/league/setup?tab=create")}
            >
              <Plus className="w-4 h-4" />
              Crea una nuova lega
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
