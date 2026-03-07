"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Users, UserCog, LayoutGrid, Calendar,
  AlertTriangle, Trash2, Loader2, Shield, CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeagueInfo {
  id: string;
  name: string;
  invite_code: string;
  is_active: boolean;
  created_at: string;
  owner_id: string;
}

interface MemberRow {
  user_id: string;
  joined_at: string;
  manager_name: string;
  team_name: string;
  is_admin: boolean;
  credits: number;
  total_points: number;
  player_count: number;
}

interface PlayerRow {
  id: string;
  name: string;
  team: string;
  role: string;
  price: number;
  is_active: boolean;
}

interface RosaRow {
  user_id: string;
  manager_name: string;
  team_name: string;
  team_id: string;
  players: string[];
  orphans: string[];
}

interface MatchdayRow {
  id: string;
  number: number;
  name: string;
  status: string;
  created_at: string;
  stat_count: number;
}

type Tab = "utenti" | "giocatori" | "rose" | "giornate";

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeagueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [league, setLeague] = useState<LeagueInfo | null>(null);
  const [tab, setTab] = useState<Tab>("utenti");
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [rose, setRose] = useState<RosaRow[]>([]);
  const [matchdays, setMatchdays] = useState<MatchdayRow[]>([]);

  const [tabLoaded, setTabLoaded] = useState<Set<Tab>>(new Set());

  // ── Load league info ──────────────────────────────────────────────────────
  useEffect(() => {
    async function loadLeague() {
      const supabase = createClient();
      const { data } = await supabase.from("leagues").select("*").eq("id", id).single();
      setLeague(data);
      setLoading(false);
    }
    loadLeague();
  }, [id]);

  // ── Load tab data on switch ───────────────────────────────────────────────
  useEffect(() => {
    if (tabLoaded.has(tab)) return;

    async function loadTab() {
      const supabase = createClient();

      if (tab === "utenti") {
        const { data: memberData } = await supabase
          .from("league_members")
          .select("user_id, joined_at")
          .eq("league_id", id);

        if (!memberData || memberData.length === 0) { setTabLoaded((s) => new Set(s).add(tab)); return; }

        const userIds = memberData.map((m) => m.user_id);
        const [{ data: profiles }, { data: teams }] = await Promise.all([
          supabase.from("profiles").select("id, manager_name, team_name, is_admin").in("id", userIds),
          supabase.from("user_teams").select("user_id, credits, total_points, players").eq("league_id", id).in("user_id", userIds),
        ]);

        const rows: MemberRow[] = memberData.map((m) => {
          const p = (profiles ?? []).find((x) => x.id === m.user_id);
          const t = (teams ?? []).find((x) => x.user_id === m.user_id);
          return {
            user_id: m.user_id,
            joined_at: m.joined_at,
            manager_name: p?.manager_name ?? "—",
            team_name: p?.team_name ?? "—",
            is_admin: p?.is_admin ?? false,
            credits: t?.credits ?? 0,
            total_points: t?.total_points ?? 0,
            player_count: (t?.players as string[] | null)?.length ?? 0,
          };
        });
        setMembers(rows);
      }

      if (tab === "giocatori") {
        const { data } = await supabase
          .from("players")
          .select("id, name, team, role, price, is_active")
          .eq("league_id", id)
          .order("role").order("name");
        setPlayers(data ?? []);
      }

      if (tab === "rose") {
        const [{ data: teams }, { data: playerData }, { data: profiles }] = await Promise.all([
          supabase.from("user_teams").select("id, user_id, players").eq("league_id", id),
          supabase.from("players").select("id").eq("league_id", id),
          supabase.from("profiles").select("id, manager_name, team_name"),
        ]);

        const existingIds = new Set((playerData ?? []).map((p) => p.id));
        const rows: RosaRow[] = (teams ?? []).map((t) => {
          const pl = (t.players as string[]) ?? [];
          const profile = (profiles ?? []).find((p) => p.id === t.user_id);
          return {
            user_id: t.user_id,
            team_id: t.id,
            manager_name: profile?.manager_name ?? "—",
            team_name: profile?.team_name ?? "—",
            players: pl,
            orphans: pl.filter((pid) => !existingIds.has(pid)),
          };
        });
        setRose(rows);
      }

      if (tab === "giornate") {
        const { data } = await supabase
          .from("matchdays")
          .select("id, number, name, status, created_at, player_match_stats(count)")
          .eq("league_id", id)
          .order("number", { ascending: false });

        const rows: MatchdayRow[] = (data ?? []).map((m) => ({
          id: m.id,
          number: m.number,
          name: m.name,
          status: m.status,
          created_at: m.created_at,
          stat_count: (m.player_match_stats as unknown as { count: number }[])?.[0]?.count ?? 0,
        }));
        setMatchdays(rows);
      }

      setTabLoaded((s) => new Set(s).add(tab));
    }

    loadTab();
  }, [tab, id, tabLoaded]);

  // ── Clean orphans ─────────────────────────────────────────────────────────
  async function cleanOrphans(row: RosaRow) {
    const supabase = createClient();
    const cleaned = row.players.filter((pid) => !row.orphans.includes(pid));
    const { error } = await supabase
      .from("user_teams")
      .update({
        players: cleaned,
        lineup: [] as unknown[],
      })
      .eq("id", row.team_id);

    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
      return;
    }

    setRose((prev) =>
      prev.map((r) =>
        r.team_id === row.team_id ? { ...r, players: cleaned, orphans: [] } : r
      )
    );
    toast({ title: "Orfani rimossi", description: `${row.orphans.length} player_id non validi rimossi dalla rosa di ${row.team_name}.` });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Lega non trovata.</p>
        <Button onClick={() => router.push("/superadmin/leagues")}>Torna alla lista</Button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "utenti", label: "Utenti", icon: Users },
    { key: "giocatori", label: "Giocatori", icon: UserCog },
    { key: "rose", label: "Rose", icon: LayoutGrid },
    { key: "giornate", label: "Giornate", icon: Calendar },
  ];

  const isTabLoaded = tabLoaded.has(tab);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-stork-dark-card border-b border-stork-dark-border px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push("/superadmin/leagues")}
              className="w-8 h-8 rounded-lg border border-stork-dark-border flex items-center justify-center hover:border-stork-orange/40 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="font-black truncate">{league.name}</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground bg-stork-dark px-1.5 py-0.5 rounded">
                  {league.invite_code}
                </span>
                <Badge variant={league.is_active ? "success" : "secondary"} className="text-[10px]">
                  {league.is_active ? "Attiva" : "Inattiva"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Shield className="w-4 h-4 text-red-400" />
            <span className="text-xs text-muted-foreground hidden sm:block">Super Admin</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-stork-dark-border bg-stork-dark-card/50 sticky top-[61px] z-10">
        <div className="max-w-5xl mx-auto flex overflow-x-auto scrollbar-none px-4">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 shrink-0 transition-colors",
                tab === key
                  ? "border-stork-orange text-stork-orange"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {key === "rose" && rose.some((r) => r.orphans.length > 0) && (
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 lg:p-6">
        {!isTabLoaded ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ── Tab Utenti ── */}
            {tab === "utenti" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">{members.length} iscritti alla lega</p>
                {members.length === 0 && <p className="text-muted-foreground text-center py-12">Nessun membro.</p>}
                {members.map((m) => (
                  <div key={m.user_id} className="bg-stork-dark-card border border-stork-dark-border rounded-xl px-5 py-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold">{m.manager_name}</span>
                          {m.is_admin && <Badge variant="outline" className="text-[10px] border-stork-gold text-stork-gold">Admin</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{m.team_name}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 font-mono">{m.user_id}</p>
                      </div>
                      <div className="flex gap-4 text-sm text-right">
                        <div>
                          <p className="font-bold text-stork-orange">{m.total_points}</p>
                          <p className="text-[10px] text-muted-foreground">punti</p>
                        </div>
                        <div>
                          <p className="font-bold text-yellow-400">{m.credits}</p>
                          <p className="text-[10px] text-muted-foreground">crediti</p>
                        </div>
                        <div>
                          <p className="font-bold text-blue-400">{m.player_count}</p>
                          <p className="text-[10px] text-muted-foreground">giocatori</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Iscritto il {new Date(m.joined_at).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Tab Giocatori ── */}
            {tab === "giocatori" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">{players.length} giocatori nella lega</p>
                {players.length === 0 && <p className="text-muted-foreground text-center py-12">Nessun giocatore.</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        "bg-stork-dark-card border rounded-xl px-4 py-3",
                        p.is_active ? "border-stork-dark-border" : "border-red-500/20 opacity-50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.team}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="text-[10px] mb-1">{p.role}</Badge>
                          <p className="text-xs font-bold text-yellow-400">{p.price} SK</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono mt-1 truncate">{p.id}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tab Rose ── */}
            {tab === "rose" && (
              <div className="space-y-3">
                {rose.some((r) => r.orphans.length > 0) && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Trovati giocatori orfani (ID in rosa ma non nel database). Usa "Pulisci" per rimuoverli.
                  </div>
                )}
                {rose.length === 0 && <p className="text-muted-foreground text-center py-12">Nessuna rosa trovata.</p>}
                {rose.map((r) => (
                  <div
                    key={r.team_id}
                    className={cn(
                      "bg-stork-dark-card border rounded-xl px-5 py-4",
                      r.orphans.length > 0 ? "border-red-500/30" : "border-stork-dark-border"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{r.manager_name}</span>
                          {r.orphans.length === 0 && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          {r.orphans.length > 0 && (
                            <Badge variant="destructive" className="text-[10px]">
                              {r.orphans.length} orfani
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{r.team_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.players.length} giocatori in rosa</p>
                      </div>
                      {r.orphans.length > 0 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cleanOrphans(r)}
                          className="shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Pulisci orfani
                        </Button>
                      )}
                    </div>

                    {r.orphans.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">ID orfani:</p>
                        {r.orphans.map((oid) => (
                          <p key={oid} className="text-xs font-mono text-red-300 bg-red-500/10 px-2 py-1 rounded">
                            {oid}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Tab Giornate ── */}
            {tab === "giornate" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">{matchdays.length} giornate create</p>
                {matchdays.length === 0 && <p className="text-muted-foreground text-center py-12">Nessuna giornata.</p>}
                {matchdays.map((m) => (
                  <div key={m.id} className="bg-stork-dark-card border border-stork-dark-border rounded-xl px-5 py-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{m.name}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{m.id}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold">{m.stat_count}</p>
                        <p className="text-[10px] text-muted-foreground">stats</p>
                      </div>
                      <Badge
                        variant={m.status === "calculated" ? "success" : m.status === "locked" ? "warning" : "secondary"}
                        className="text-[10px]"
                      >
                        {m.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
