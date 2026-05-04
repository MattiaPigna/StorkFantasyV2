"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Shield, LogOut, Search, Users, ChevronRight, Loader2,
  Plus, Pencil, Trash2, Check, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createLeagueAsSuperAdmin, updateLeague, deleteLeague } from "@/lib/db/leagues";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);

  // Inline rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/superadmin/login");
  }

  async function handleCreate() {
    const name = createName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");
      const newLeague = await createLeagueAsSuperAdmin(name, user.id);
      setLeagues((prev) => [{
        id: newLeague.id,
        name: newLeague.name,
        invite_code: newLeague.invite_code,
        is_active: newLeague.is_active,
        created_at: newLeague.created_at,
        owner_id: newLeague.owner_id,
        member_count: 0,
      }, ...prev]);
      setCreateName("");
      setCreateOpen(false);
      toast({ title: "Lega creata!", description: `"${newLeague.name}" — codice: ${newLeague.invite_code}` });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setCreating(false);
    }
  }

  function startEdit(league: LeagueRow) {
    setEditingId(league.id);
    setEditingName(league.name);
  }

  async function saveEdit(id: string) {
    const name = editingName.trim();
    if (!name) return;
    setSavingId(id);
    try {
      await updateLeague(id, { name });
      setLeagues((prev) => prev.map((l) => l.id === id ? { ...l, name } : l));
      setEditingId(null);
      toast({ title: "Lega rinominata" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(league: LeagueRow) {
    try {
      await deleteLeague(league.id);
      setLeagues((prev) => prev.filter((l) => l.id !== league.id));
      toast({ title: "Lega eliminata", description: `"${league.name}" rimossa.` });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
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
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuova Lega</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-red-400">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Esci</span>
          </Button>
        </div>
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
              <div
                key={league.id}
                className="w-full bg-stork-dark-card border border-stork-dark-border rounded-xl px-5 py-4 hover:border-stork-orange/20 transition-all group flex items-center justify-between gap-4"
              >
                {/* Left: name + meta */}
                <div className="min-w-0 flex-1">
                  {editingId === league.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(league.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="h-8 text-sm font-bold max-w-xs"
                      />
                      <button
                        onClick={() => saveEdit(league.id)}
                        disabled={savingId === league.id}
                        className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                      >
                        {savingId === league.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold truncate">{league.name}</span>
                      <Badge variant={league.is_active ? "success" : "secondary"} className="text-[10px] shrink-0">
                        {league.is_active ? "Attiva" : "Inattiva"}
                      </Badge>
                    </div>
                  )}
                  {editingId !== league.id && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-mono bg-stork-dark px-2 py-0.5 rounded">{league.invite_code}</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {league.member_count} membri
                      </span>
                      <span>{new Date(league.created_at).toLocaleDateString("it-IT")}</span>
                    </div>
                  )}
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {editingId !== league.id && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(league); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-stork-orange hover:bg-stork-orange/10 transition-colors"
                        title="Rinomina"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Elimina"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminare &ldquo;{league.name}&rdquo;?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Verranno eliminati <strong>tutti i dati</strong> della lega: giocatori, giornate, formazioni, classifica e tutti i membri ({league.member_count}). Operazione <strong>irreversibile</strong>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(league)} className="bg-destructive hover:bg-destructive/90">
                              Sì, elimina tutto
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <button
                        onClick={() => router.push(`/superadmin/leagues/${league.id}`)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-stork-orange transition-colors"
                        title="Dettagli"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-12">Nessuna lega trovata</p>
            )}
          </div>
        )}
      </div>

      {/* Create League Dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setCreateName(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-stork-orange" />
              Crea Nuova Lega
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome della lega</label>
              <Input
                autoFocus
                placeholder="Es: Torneo Primavera 2026"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground">
                Un codice invito verrà generato automaticamente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCreateOpen(false); setCreateName(""); }}>
              Annulla
            </Button>
            <Button onClick={handleCreate} disabled={creating || !createName.trim()}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {creating ? "Creazione..." : "Crea Lega"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
