"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Users, UserCog, LayoutGrid, Calendar,
  AlertTriangle, Trash2, Loader2, Shield, CheckCircle2,
  Pencil, X, Check, UserMinus, Palette, Save, Image,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteUserCompletely } from "@/app/actions/users";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeagueInfo {
  id: string; name: string; invite_code: string;
  is_active: boolean; created_at: string; owner_id: string;
  primary_color?: string | null; logo_url?: string | null;
}

interface MemberRow {
  user_id: string; joined_at: string; manager_name: string;
  team_name: string; is_admin: boolean; credits: number;
  total_points: number; player_count: number; team_id: string;
}

interface PlayerRow {
  id: string; name: string; team: string;
  role: string; price: number; is_active: boolean;
}

interface RosaRow {
  user_id: string; manager_name: string; team_name: string;
  team_id: string; players: string[]; orphans: string[];
  lineup: { position: number; player_id: string | null }[];
  player_names: Record<string, string>;
}

interface MatchdayRow {
  id: string; number: number; name: string;
  status: string; created_at: string; stat_count: number;
}

type Tab = "utenti" | "giocatori" | "rose" | "giornate" | "design";

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

  // edit states
  const [editingCredits, setEditingCredits] = useState<string | null>(null);
  const [creditsValue, setCreditsValue] = useState("");
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [playerEdit, setPlayerEdit] = useState<Partial<PlayerRow>>({});

  // design state
  const [designColor, setDesignColor] = useState("#F97316");
  const [designLogo, setDesignLogo] = useState("");
  const [savingDesign, setSavingDesign] = useState(false);

  useEffect(() => {
    async function loadLeague() {
      const supabase = createClient();
      const { data } = await supabase.from("leagues").select("*").eq("id", id).single();
      setLeague(data);
      if (data?.primary_color) setDesignColor(data.primary_color);
      if (data?.logo_url) setDesignLogo(data.logo_url);
      setLoading(false);
    }
    loadLeague();
  }, [id]);

  useEffect(() => {
    if (tabLoaded.has(tab)) return;
    async function loadTab() {
      const supabase = createClient();

      if (tab === "utenti") {
        const { data: memberData } = await supabase
          .from("league_members").select("user_id, joined_at").eq("league_id", id);
        if (!memberData?.length) { markLoaded(); return; }
        const userIds = memberData.map((m) => m.user_id);
        const [{ data: profiles }, { data: teams }] = await Promise.all([
          supabase.from("profiles").select("id, manager_name, team_name, is_admin").in("id", userIds),
          supabase.from("user_teams").select("id, user_id, credits, total_points, players").eq("league_id", id).in("user_id", userIds),
        ]);
        setMembers(memberData.map((m) => {
          const p = (profiles ?? []).find((x) => x.id === m.user_id);
          const t = (teams ?? []).find((x) => x.user_id === m.user_id);
          return {
            user_id: m.user_id, joined_at: m.joined_at,
            manager_name: p?.manager_name ?? "—", team_name: p?.team_name ?? "—",
            is_admin: p?.is_admin ?? false, credits: t?.credits ?? 0,
            total_points: t?.total_points ?? 0,
            player_count: (t?.players as string[] | null)?.length ?? 0,
            team_id: t?.id ?? "",
          };
        }));
      }

      if (tab === "giocatori") {
        const { data } = await supabase.from("players")
          .select("id, name, team, role, price, is_active")
          .eq("league_id", id).order("role").order("name");
        setPlayers(data ?? []);
      }

      if (tab === "rose") {
        const [{ data: teams }, { data: playerData }, { data: profiles }] = await Promise.all([
          supabase.from("user_teams").select("id, user_id, players, lineup").eq("league_id", id),
          supabase.from("players").select("id, name").eq("league_id", id),
          supabase.from("profiles").select("id, manager_name, team_name"),
        ]);
        const playerMap = Object.fromEntries((playerData ?? []).map((p) => [p.id, p.name]));
        const existingIds = new Set(Object.keys(playerMap));
        setRose((teams ?? []).map((t) => {
          const pl = (t.players as string[]) ?? [];
          const profile = (profiles ?? []).find((p) => p.id === t.user_id);
          return {
            user_id: t.user_id, team_id: t.id,
            manager_name: profile?.manager_name ?? "—",
            team_name: profile?.team_name ?? "—",
            players: pl, orphans: pl.filter((pid) => !existingIds.has(pid)),
            lineup: (t.lineup as { position: number; player_id: string | null }[]) ?? [],
            player_names: playerMap,
          };
        }));
      }

      if (tab === "giornate") {
        const { data } = await supabase.from("matchdays")
          .select("id, number, name, status, created_at, player_match_stats(count)")
          .eq("league_id", id).order("number", { ascending: false });
        setMatchdays((data ?? []).map((m) => ({
          id: m.id, number: m.number, name: m.name, status: m.status,
          created_at: m.created_at,
          stat_count: (m.player_match_stats as unknown as { count: number }[])?.[0]?.count ?? 0,
        })));
      }

      markLoaded();
    }
    function markLoaded() { setTabLoaded((s) => new Set(s).add(tab)); }
    loadTab();
  }, [tab, id, tabLoaded]);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function saveDesign() {
    setSavingDesign(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("leagues").update({
        primary_color: designColor,
        logo_url: designLogo.trim() || null,
      }).eq("id", id);
      if (error) throw error;
      setLeague((prev) => prev ? { ...prev, primary_color: designColor, logo_url: designLogo.trim() || null } : prev);
      toast({ title: "Design salvato!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setSavingDesign(false);
    }
  }

  async function kickMember(userId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("league_members").delete()
      .eq("league_id", id).eq("user_id", userId);
    if (error) { toast({ variant: "destructive", title: "Errore", description: error.message }); return; }
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    toast({ title: "Membro rimosso dalla lega" });
  }

  async function deleteUserAccount(userId: string) {
    const { error } = await deleteUserCompletely(userId);
    if (error) { toast({ variant: "destructive", title: "Errore", description: error }); return; }
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    toast({ title: "Account eliminato", description: "Utente rimosso da Supabase." });
  }

  async function saveCredits(member: MemberRow) {
    const val = parseInt(creditsValue);
    if (isNaN(val) || val < 0) { toast({ variant: "destructive", title: "Valore non valido" }); return; }
    const supabase = createClient();
    const { error } = await supabase.from("user_teams").update({ credits: val }).eq("id", member.team_id);
    if (error) { toast({ variant: "destructive", title: "Errore", description: error.message }); return; }
    setMembers((prev) => prev.map((m) => m.user_id === member.user_id ? { ...m, credits: val } : m));
    setEditingCredits(null);
    toast({ title: "Crediti aggiornati" });
  }

  async function savePlayer(player: PlayerRow) {
    const supabase = createClient();
    const updates = {
      name: playerEdit.name ?? player.name,
      team: playerEdit.team ?? player.team,
      role: playerEdit.role ?? player.role,
      price: playerEdit.price ?? player.price,
    };
    const { error } = await supabase.from("players").update(updates).eq("id", player.id);
    if (error) { toast({ variant: "destructive", title: "Errore", description: error.message }); return; }
    setPlayers((prev) => prev.map((p) => p.id === player.id ? { ...p, ...updates } : p));
    setEditingPlayer(null);
    toast({ title: "Giocatore aggiornato" });
  }

  async function deletePlayer(player: PlayerRow) {
    const supabase = createClient();
    const { error } = await supabase.from("players").delete().eq("id", player.id);
    if (error) { toast({ variant: "destructive", title: "Errore", description: error.message }); return; }

    // Remove from all user_teams in the league
    const { data: teams } = await supabase.from("user_teams")
      .select("id, players, lineup").eq("league_id", id);
    const affected = (teams ?? []).filter((t) => (t.players as string[]).includes(player.id));
    await Promise.all(affected.map((t) =>
      supabase.from("user_teams").update({
        players: (t.players as string[]).filter((pid: string) => pid !== player.id),
        lineup: (t.lineup as { position: number; player_id: string | null }[]).map((s) =>
          s.player_id === player.id ? { ...s, player_id: null } : s
        ),
      }).eq("id", t.id)
    ));

    setPlayers((prev) => prev.filter((p) => p.id !== player.id));
    toast({ title: "Giocatore eliminato", description: `${player.name} rimosso da tutte le rose.` });
  }

  async function removeFromRosa(row: RosaRow, playerId: string) {
    const supabase = createClient();
    const updatedPlayers = row.players.filter((pid) => pid !== playerId);
    const updatedLineup = row.lineup.map((s) =>
      s.player_id === playerId ? { ...s, player_id: null } : s
    );
    const { error } = await supabase.from("user_teams")
      .update({ players: updatedPlayers, lineup: updatedLineup })
      .eq("id", row.team_id);
    if (error) { toast({ variant: "destructive", title: "Errore", description: error.message }); return; }
    setRose((prev) => prev.map((r) => r.team_id === row.team_id
      ? { ...r, players: updatedPlayers, lineup: updatedLineup, orphans: r.orphans.filter((o) => o !== playerId) } : r
    ));
    toast({ title: "Giocatore rimosso dalla rosa" });
  }

  async function cleanOrphans(row: RosaRow) {
    const supabase = createClient();
    const cleaned = row.players.filter((pid) => !row.orphans.includes(pid));
    const cleanedLineup = row.lineup.map((s) =>
      s.player_id && row.orphans.includes(s.player_id) ? { ...s, player_id: null } : s
    );
    const { error } = await supabase.from("user_teams")
      .update({ players: cleaned, lineup: cleanedLineup }).eq("id", row.team_id);
    if (error) { toast({ variant: "destructive", title: "Errore", description: error.message }); return; }
    setRose((prev) => prev.map((r) => r.team_id === row.team_id ? { ...r, players: cleaned, lineup: cleanedLineup, orphans: [] } : r));
    toast({ title: "Orfani rimossi", description: `${row.orphans.length} ID non validi rimossi.` });
  }

  async function deleteMatchday(matchday: MatchdayRow) {
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_matchday_safe", { p_matchday_id: matchday.id });
    if (error) { toast({ variant: "destructive", title: "Errore", description: error.message }); return; }
    setMatchdays((prev) => prev.filter((m) => m.id !== matchday.id));
    toast({ title: "Giornata eliminata", description: matchday.name });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!league) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Lega non trovata.</p>
      <Button onClick={() => router.push("/superadmin/leagues")}>Torna alla lista</Button>
    </div>
  );

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "utenti", label: "Utenti", icon: Users },
    { key: "giocatori", label: "Giocatori", icon: UserCog },
    { key: "rose", label: "Rose", icon: LayoutGrid },
    { key: "giornate", label: "Giornate", icon: Calendar },
    { key: "design", label: "Design", icon: Palette },
  ];

  const isTabLoaded = tabLoaded.has(tab);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-stork-dark-card border-b border-stork-dark-border px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push("/superadmin/leagues")}
              className="w-8 h-8 rounded-lg border border-stork-dark-border flex items-center justify-center hover:border-stork-orange/40 transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="font-black truncate">{league.name}</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground bg-stork-dark px-1.5 py-0.5 rounded">{league.invite_code}</span>
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
            <button key={key} onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 shrink-0 transition-colors",
                tab === key ? "border-stork-orange text-stork-orange" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
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
        {tab !== "design" && !isTabLoaded ? (
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
                {members.map((m) => {
                  const profileMissing = m.team_name === "—" && m.manager_name === "—";
                  return (
                  <div key={m.user_id} className={`bg-stork-dark-card border rounded-xl px-5 py-4 ${profileMissing ? "border-red-500/30 bg-red-500/5" : "border-stork-dark-border"}`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {profileMissing
                            ? <><AlertTriangle className="w-4 h-4 text-red-400" /><span className="font-bold text-red-400">Profilo mancante</span><Badge variant="destructive" className="text-[10px]">Da eliminare</Badge></>
                            : <><span className="font-bold">{m.manager_name}</span>{m.is_admin && <Badge variant="outline" className="text-[10px] border-stork-gold text-stork-gold">Admin</Badge>}</>
                          }
                        </div>
                        <p className="text-sm text-muted-foreground">{m.team_name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{m.user_id}</p>
                      </div>
                      <div className="flex gap-3 text-sm text-right items-center">
                        <div>
                          <p className="font-bold text-stork-orange">{m.total_points}</p>
                          <p className="text-[10px] text-muted-foreground">punti</p>
                        </div>
                        {/* Editable credits */}
                        <div>
                          {editingCredits === m.user_id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number" value={creditsValue}
                                onChange={(e) => setCreditsValue(e.target.value)}
                                className="w-20 h-7 text-xs text-center"
                                autoFocus
                              />
                              <button onClick={() => saveCredits(m)} className="text-emerald-400 hover:text-emerald-300"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setEditingCredits(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingCredits(m.user_id); setCreditsValue(String(m.credits)); }}
                              className="group flex flex-col items-end hover:text-yellow-300 transition-colors">
                              <span className="font-bold text-yellow-400 group-hover:text-yellow-300 flex items-center gap-1">
                                {m.credits} <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                              </span>
                              <span className="text-[10px] text-muted-foreground">crediti</span>
                            </button>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-blue-400">{m.player_count}</p>
                          <p className="text-[10px] text-muted-foreground">giocatori</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">
                        Iscritto il {new Date(m.joined_at).toLocaleDateString("it-IT")}
                      </p>
                      <div className="flex items-center gap-1">
                        {/* Kick dalla lega */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-yellow-400 hover:bg-yellow-500/10 h-7 px-2 text-xs">
                              <UserMinus className="w-3.5 h-3.5 mr-1" /> Kick
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Rimuovere {m.manager_name} dalla lega?</AlertDialogTitle>
                              <AlertDialogDescription>
                                L&apos;utente verrà rimosso da questa lega. Il suo account resterà attivo.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => kickMember(m.user_id)} className="bg-yellow-600 hover:bg-yellow-500">Rimuovi dalla lega</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        {/* Elimina account completo */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10 h-7 px-2 text-xs">
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Elimina
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminare account {m.manager_name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                L&apos;account verrà eliminato definitivamente da Supabase. Rosa, punti e accesso verranno rimossi. Azione irreversibile.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteUserAccount(m.user_id)} className="bg-destructive hover:bg-destructive/90">Elimina account</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {/* ── Tab Giocatori ── */}
            {tab === "giocatori" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">{players.length} giocatori nella lega</p>
                {players.length === 0 && <p className="text-muted-foreground text-center py-12">Nessun giocatore.</p>}
                <div className="space-y-2">
                  {players.map((p) => (
                    <div key={p.id} className={cn(
                      "bg-stork-dark-card border rounded-xl px-4 py-3",
                      p.is_active ? "border-stork-dark-border" : "border-red-500/20 opacity-60"
                    )}>
                      {editingPlayer === p.id ? (
                        /* Edit form */
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="col-span-2 space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Nome</label>
                              <Input value={playerEdit.name ?? p.name}
                                onChange={(e) => setPlayerEdit((prev) => ({ ...prev, name: e.target.value }))}
                                className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Squadra</label>
                              <Input value={playerEdit.team ?? p.team}
                                onChange={(e) => setPlayerEdit((prev) => ({ ...prev, team: e.target.value }))}
                                className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Prezzo SK</label>
                              <Input type="number" value={playerEdit.price ?? p.price}
                                onChange={(e) => setPlayerEdit((prev) => ({ ...prev, price: Number(e.target.value) }))}
                                className="h-8 text-sm" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select value={playerEdit.role ?? p.role}
                              onChange={(e) => setPlayerEdit((prev) => ({ ...prev, role: e.target.value }))}
                              className="h-8 rounded-lg border border-stork-dark-border bg-muted px-2 text-sm">
                              <option value="P">Portiere</option>
                              <option value="M">Giocatore</option>
                            </select>
                            <Button size="sm" onClick={() => savePlayer(p)} className="h-8">
                              <Check className="w-3.5 h-3.5 mr-1" /> Salva
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingPlayer(null)} className="h-8">
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* View row */
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.team} · <Badge variant="outline" className="text-[10px] py-0 px-1">{p.role}</Badge> · {p.price} SK</p>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{p.id}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-stork-orange"
                              onClick={() => { setEditingPlayer(p.id); setPlayerEdit({}); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminare {p.name}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Il giocatore verrà eliminato dal database e rimosso da tutte le rose della lega.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deletePlayer(p)} className="bg-destructive hover:bg-destructive/90">Elimina</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
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
                    Trovati giocatori orfani. Usa &quot;Pulisci&quot; per rimuoverli.
                  </div>
                )}
                {rose.length === 0 && <p className="text-muted-foreground text-center py-12">Nessuna rosa trovata.</p>}
                {rose.map((r) => (
                  <div key={r.team_id} className={cn(
                    "bg-stork-dark-card border rounded-xl px-5 py-4",
                    r.orphans.length > 0 ? "border-red-500/30" : "border-stork-dark-border"
                  )}>
                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{r.manager_name}</span>
                          {r.orphans.length === 0 && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          {r.orphans.length > 0 && <Badge variant="destructive" className="text-[10px]">{r.orphans.length} orfani</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{r.team_name} · {r.players.length} giocatori</p>
                      </div>
                      {r.orphans.length > 0 && (
                        <Button size="sm" variant="destructive" onClick={() => cleanOrphans(r)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Pulisci orfani
                        </Button>
                      )}
                    </div>

                    {/* Player list */}
                    <div className="space-y-1 mt-2">
                      {r.players.map((pid) => {
                        const isOrphan = r.orphans.includes(pid);
                        const name = r.player_names[pid];
                        return (
                          <div key={pid} className={cn(
                            "flex items-center justify-between px-3 py-1.5 rounded-lg text-xs",
                            isOrphan ? "bg-red-500/10 text-red-400" : "bg-muted/40"
                          )}>
                            <span className="font-medium">{isOrphan ? "ORFANO" : name}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-muted-foreground">{pid.slice(0, 8)}…</span>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="hover:text-red-400 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Rimuovere dalla rosa?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {isOrphan ? `ID orfano ${pid}` : `${name}`} verrà rimosso dalla rosa di {r.team_name}.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => removeFromRosa(r, pid)} className="bg-destructive hover:bg-destructive/90">Rimuovi</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                    <div className="min-w-0">
                      <p className="font-bold">{m.name}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{m.id}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold">{m.stat_count}</p>
                        <p className="text-[10px] text-muted-foreground">stats</p>
                      </div>
                      <Badge variant={m.status === "calculated" ? "success" : m.status === "locked" ? "warning" : "secondary"} className="text-[10px]">
                        {m.status}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminare {m.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Verranno eliminati anche tutti i {m.stat_count} stats associati a questa giornata. Azione irreversibile.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMatchday(m)} className="bg-destructive hover:bg-destructive/90">Elimina</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Tab Design ── */}
            {tab === "design" && (
              <div className="space-y-6 max-w-lg">
                <p className="text-sm text-muted-foreground">
                  Personalizza l&apos;aspetto della dashboard per questa lega. Le modifiche saranno visibili agli utenti al prossimo cambio di lega.
                </p>

                {/* Color picker */}
                <div className="bg-stork-dark-card border border-stork-dark-border rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Palette className="w-4 h-4 text-stork-orange" />
                    Colore primario
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <input
                        type="color"
                        value={designColor}
                        onChange={(e) => setDesignColor(e.target.value)}
                        className="w-14 h-14 rounded-xl cursor-pointer border-0 bg-transparent p-0.5"
                        title="Scegli colore"
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium">Hex</p>
                      <input
                        type="text"
                        value={designColor}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setDesignColor(v);
                        }}
                        className="w-full h-9 rounded-lg border border-stork-dark-border bg-stork-dark px-3 text-sm font-mono"
                        maxLength={7}
                      />
                    </div>
                    {/* Preview */}
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: designColor }}
                    >
                      <span className="text-xs font-black text-black/70">AA</span>
                    </div>
                  </div>
                  {/* Preset palette */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Colori rapidi</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "#F97316", "#3B82F6", "#10B981", "#8B5CF6",
                        "#EF4444", "#F59E0B", "#EC4899", "#06B6D4",
                        "#84CC16", "#6366F1",
                      ].map((c) => (
                        <button
                          key={c}
                          onClick={() => setDesignColor(c)}
                          className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
                          style={{ background: c, borderColor: designColor === c ? "white" : "transparent" }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Logo URL */}
                <div className="bg-stork-dark-card border border-stork-dark-border rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Image className="w-4 h-4 text-stork-orange" />
                    Logo lega
                  </h3>
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={designLogo}
                      onChange={(e) => setDesignLogo(e.target.value)}
                      placeholder="https://... (URL immagine)"
                      className="w-full h-9 rounded-lg border border-stork-dark-border bg-stork-dark px-3 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lascia vuoto per usare l&apos;icona predefinita. Il logo appare nella sidebar e nel selettore lega mobile.
                    </p>
                  </div>
                  {designLogo && (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center"
                        style={{ background: designColor }}
                      >
                        <img
                          src={designLogo}
                          alt="Preview logo"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{league?.name}</p>
                        <p className="text-xs text-muted-foreground">Anteprima sidebar</p>
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={saveDesign} disabled={savingDesign} size="lg" className="w-full">
                  {savingDesign ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {savingDesign ? "Salvataggio..." : "Salva Design"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
