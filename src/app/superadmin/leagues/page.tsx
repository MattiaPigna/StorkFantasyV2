"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, LogOut, Search, Users, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LeagueRow {
  id: string;
  name: string;
  invite_code: string;
  is_active: boolean;
  created_at: string;
  owner_id: string;
  member_count: number;
}

export default function SuperAdminLeagues() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("leagues")
        .select("*, league_members(count)")
        .order("created_at", { ascending: false });

      const rows = (data ?? []).map((l) => ({
        id: l.id,
        name: l.name,
        invite_code: l.invite_code,
        is_active: l.is_active,
        created_at: l.created_at,
        owner_id: l.owner_id,
        member_count: (l.league_members as unknown as { count: number }[])?.[0]?.count ?? 0,
      }));
      setLeagues(rows);
      setLoading(false);
    }
    load();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/superadmin/login");
  }

  const filtered = leagues.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.invite_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-stork-dark-card border-b border-stork-dark-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="font-black text-sm">Super Admin</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Gestione Leghe</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-red-400">
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline ml-2">Esci</span>
        </Button>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-stork-dark-card border border-stork-dark-border rounded-xl p-4">
            <p className="text-3xl font-black text-stork-orange">{leagues.length}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Leghe totali</p>
          </div>
          <div className="bg-stork-dark-card border border-stork-dark-border rounded-xl p-4">
            <p className="text-3xl font-black text-blue-400">
              {leagues.reduce((s, l) => s + l.member_count, 0)}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Utenti totali</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome o codice invito..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Leagues list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((league) => (
              <button
                key={league.id}
                onClick={() => router.push(`/superadmin/leagues/${league.id}`)}
                className="w-full text-left bg-stork-dark-card border border-stork-dark-border rounded-xl px-5 py-4 hover:border-stork-orange/40 hover:bg-stork-dark/50 transition-all group flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold truncate">{league.name}</span>
                    <Badge variant={league.is_active ? "success" : "secondary"} className="text-[10px] shrink-0">
                      {league.is_active ? "Attiva" : "Inattiva"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-mono bg-stork-dark px-2 py-0.5 rounded">{league.invite_code}</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {league.member_count} membri
                    </span>
                    <span>{new Date(league.created_at).toLocaleDateString("it-IT")}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-stork-orange shrink-0 transition-colors" />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-12">Nessuna lega trovata</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
