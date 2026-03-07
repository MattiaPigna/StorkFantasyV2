"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Plus, Trash2, Loader2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getAllPlayers, createPlayer, deletePlayer } from "@/lib/db/players";
import { getTournamentTeams, type TournamentTeam } from "@/lib/db/tournament-teams";
import { useLeagueStore } from "@/store/league";
import { PLAYER_ROLE_LABELS, PLAYER_ROLE_COLORS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import type { Player, PlayerRole } from "@/types";

const playerSchema = z.object({
  name: z.string().min(2, "Minimo 2 caratteri").max(50),
  team: z.string().min(1, "Obbligatorio").max(50),
  role: z.enum(["P", "M"]),
  price: z.coerce.number().min(1).max(100),
});

type PlayerForm = z.infer<typeof playerSchema>;

export function AdminPlayersView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PlayerForm>({
    resolver: zodResolver(playerSchema),
    defaultValues: { role: "M", price: 15 },
  });

  useEffect(() => {
    if (!leagueId) return;
    Promise.all([getAllPlayers(leagueId), getTournamentTeams(leagueId)])
      .then(([pl, t]) => { setPlayers(pl); setTeams(t); })
      .finally(() => setIsLoading(false));
  }, [leagueId]);

  async function onSubmit(data: PlayerForm) {
    setIsSaving(true);
    try {
      const newPlayer = await createPlayer(leagueId, { ...data, is_active: true });
      setPlayers((prev) => [...prev, newPlayer]);
      reset({ role: "M", price: 15 });
      toast({ title: "Giocatore aggiunto!", description: `${data.name} è stato aggiunto alla rosa.` });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleJsonImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setIsImporting(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const items: { name: string; team: string; role: string; price: number }[] = Array.isArray(json) ? json : [json];
      const created: Player[] = [];
      const skipped: string[] = [];

      for (const item of items) {
        if (!item.name || !item.team || !item.role || !item.price) continue;
        // Validate team against tournament teams (case-insensitive)
        const matched = teams.find((t) => t.name.toLowerCase() === item.team.toLowerCase());
        if (!matched) {
          skipped.push(item.name);
          continue;
        }
        const p = await createPlayer(leagueId, {
          name: item.name,
          team: matched.name, // use exact name from tournament_teams
          role: (item.role as PlayerRole),
          price: Number(item.price),
          is_active: true,
        });
        created.push(p);
      }

      setPlayers((prev) => [...prev, ...created]);
      if (skipped.length > 0) {
        toast({
          variant: "destructive",
          title: `${created.length} importati, ${skipped.length} scartati`,
          description: `Squadra non trovata: ${skipped.slice(0, 3).join(", ")}${skipped.length > 3 ? ` e altri ${skipped.length - 3}` : ""}`,
        });
      } else {
        toast({ title: `${created.length} giocatori importati!` });
      }
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore importazione", description: err instanceof Error ? err.message : "JSON non valido" });
    } finally {
      setIsImporting(false);
    }
  }

  async function onDelete(player: Player) {
    try {
      await deletePlayer(player.id, leagueId);
      setPlayers((prev) => prev.filter((p) => p.id !== player.id));
      toast({ title: "Giocatore rimosso", description: `${player.name} è stato disattivato.` });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
  }

  const grouped = {
    P: players.filter((p) => p.role === "P"),
    M: players.filter((p) => p.role === "M"),
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-stork-orange" />
          <h1 className="text-2xl font-bold">Gestione Giocatori</h1>
          <Badge variant="secondary">{players.length} totali</Badge>
        </div>
        <label className="cursor-pointer">
          <input type="file" accept=".json" className="hidden" onChange={handleJsonImport} disabled={isImporting} />
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stork-dark-border bg-muted text-sm font-medium hover:border-stork-orange/40 hover:text-stork-orange transition-all">
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importa JSON
          </div>
        </label>
      </div>

      {/* Add player form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Aggiungi Giocatore
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="col-span-2 lg:col-span-2 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nome</label>
              <Input placeholder="Nome giocatore" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Squadra</label>
              <select
                {...register("team")}
                className="flex h-10 w-full rounded-lg border border-stork-dark-border bg-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stork-orange/50"
              >
                <option value="">— Seleziona squadra —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
              {errors.team && <p className="text-xs text-destructive">{errors.team.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ruolo</label>
              <select
                {...register("role")}
                className="flex h-10 w-full rounded-lg border border-stork-dark-border bg-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stork-orange/50"
              >
                {(["P", "M"] as PlayerRole[]).map((r) => (
                  <option key={r} value={r}>{PLAYER_ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Prezzo (SK)</label>
              <Input type="number" min={1} max={100} {...register("price")} />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
            <div className="col-span-2 lg:col-span-5 flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : <Plus className="w-4 h-4" />}
                Aggiungi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Players by role */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {(["P", "M"] as PlayerRole[]).map((role) => (
            <Card key={role}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Badge className={PLAYER_ROLE_COLORS[role]} variant="outline">
                    {PLAYER_ROLE_LABELS[role]}
                  </Badge>
                  <span className="text-muted-foreground font-normal">({grouped[role].length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {grouped[role].map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg bg-muted ${!player.is_active ? "opacity-40" : ""}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{player.name}</p>
                        <p className="text-xs text-muted-foreground">{player.team} · {player.price} SK</p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0 hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Rimuovere {player.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Il giocatore verrà disattivato. Non sarà più acquistabile nel mercato.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(player)} className="bg-destructive hover:bg-destructive/90">
                              Rimuovi
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                  {grouped[role].length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-full">Nessun giocatore</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
