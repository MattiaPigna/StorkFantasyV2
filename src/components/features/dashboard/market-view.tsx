"use client";

import { useEffect, useState, useMemo } from "react";
import { ShoppingCart, Search, Filter, Coins, Check, X, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getPlayers } from "@/lib/db/players";
import { getMyTeam, buyPlayer, sellPlayer } from "@/lib/db/teams";
import { getAppSettings } from "@/lib/db/settings";
import { useLeagueStore } from "@/store/league";
import { formatCredits, isMarketOpen } from "@/lib/utils";
import { PLAYER_ROLE_LABELS, PLAYER_ROLE_COLORS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Player, UserTeam, AppSettings } from "@/types";

type FilterRole = "ALL" | "P" | "M";
type SortPrice = "none" | "asc" | "desc";

const PAGE_SIZE = 20;

export function MarketView({ onTeamChange }: { onTeamChange?: (team: UserTeam) => void } = {}) {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [players, setPlayers] = useState<Player[]>([]);
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<FilterRole>("ALL");
  const [filterTeam, setFilterTeam] = useState<string>("ALL");
  const [sortPrice, setSortPrice] = useState<SortPrice>("none");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!leagueId) return;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        const cached = useLeagueStore.getState().appSettings;
        const [pl, t, s] = await Promise.all([
          getPlayers(leagueId),
          getMyTeam(user.id, leagueId),
          cached ? Promise.resolve(cached) : getAppSettings(leagueId),
        ]);
        if (!cached && s) useLeagueStore.getState().setAppSettings(s);
        setPlayers(pl);
        setTeam(t);
        setSettings(s);
      } catch {
        // show empty state rather than infinite spinner
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [leagueId]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setCurrentPage(1); }, [search, filterRole, filterTeam, sortPrice]);

  const availableTeams = useMemo(() => Array.from(new Set(players.map((p) => p.team))).sort(), [players]);

  const filteredPlayers = useMemo(() => {
    let result = players.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.team.toLowerCase().includes(search.toLowerCase());
      const matchesRole = filterRole === "ALL" || p.role === filterRole;
      const matchesTeam = filterTeam === "ALL" || p.team === filterTeam;
      return matchesSearch && matchesRole && matchesTeam;
    });
    if (sortPrice === "asc") result = [...result].sort((a, b) => a.price - b.price);
    if (sortPrice === "desc") result = [...result].sort((a, b) => b.price - a.price);
    return result;
  }, [players, search, filterRole, filterTeam, sortPrice]);

  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / PAGE_SIZE));
  const paginatedPlayers = filteredPlayers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleBuy(player: Player) {
    if (!team || !userId) return;
    setActionLoading(player.id);
    try {
      await buyPlayer(team.id, player.id, player.price, team.players, team.credits);
      const updated: UserTeam = { ...team, players: [...team.players, player.id], credits: team.credits - player.price };
      setTeam(updated);
      onTeamChange?.(updated);
      toast({ title: "Acquisto completato!", description: `${player.name} è nella tua rosa.` });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore durante l'acquisto" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSell(player: Player) {
    if (!team || !userId) return;
    setActionLoading(player.id);
    try {
      await sellPlayer(team.id, player.id, player.price, team.players, team.credits, team.lineup ?? []);
      const updated: UserTeam = {
        ...team,
        players: team.players.filter((id) => id !== player.id),
        credits: team.credits + player.price,
        lineup: (team.lineup ?? []).map((slot) =>
          slot.player_id === player.id ? { ...slot, player_id: null } : slot
        ),
      };
      setTeam(updated);
      onTeamChange?.(updated);
      toast({ title: "Vendita completata!", description: `+${formatCredits(player.price)} accreditati.` });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore durante la vendita" });
    } finally {
      setActionLoading(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const marketClosed = !isMarketOpen(settings);

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-stork-orange" />
          <h1 className="text-2xl font-bold">Calciomercato</h1>
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold">{formatCredits(team?.credits ?? 0)}</span>
        </div>
      </div>

      {/* Market closed warning */}
      {marketClosed && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-3">
          <X className="w-5 h-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">Il mercato è attualmente chiuso. Non è possibile effettuare transazioni.</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca giocatore o squadra..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(["ALL", "P", "M"] as FilterRole[]).map((role) => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterRole === role
                    ? "bg-gradient-to-r from-stork-orange to-stork-gold-dark text-black"
                    : "bg-stork-dark border border-stork-dark-border text-muted-foreground hover:text-foreground hover:border-stork-orange/30"
                }`}
              >
                {role === "ALL" ? "Tutti" : role === "P" ? "Portieri" : "Movimento"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="bg-stork-dark border border-stork-dark-border text-sm text-foreground rounded-lg px-3 py-1.5 outline-none focus:border-stork-orange/50 cursor-pointer"
          >
            <option value="ALL">Tutte le squadre</option>
            {availableTeams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <div className="flex gap-1.5">
            {([
              { key: "none", label: "Prezzo", icon: ArrowUpDown },
              { key: "asc",  label: "↑ Prezzo", icon: ArrowUp },
              { key: "desc", label: "↓ Prezzo", icon: ArrowDown },
            ] as { key: SortPrice; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSortPrice(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  sortPrice === key
                    ? "bg-gradient-to-r from-stork-orange to-stork-gold-dark text-black"
                    : "bg-stork-dark border border-stork-dark-border text-muted-foreground hover:text-foreground hover:border-stork-orange/30"
                }`}
              >
                <Icon className="w-3 h-3" />{label}
              </button>
            ))}
          </div>

          <span className="text-xs text-muted-foreground ml-auto">{filteredPlayers.length} giocatori</span>
        </div>
      </div>

      {/* Players grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {paginatedPlayers.map((player) => {
          const owned = team?.players.includes(player.id) ?? false;
          const canAfford = (team?.credits ?? 0) >= player.price;
          const rosterFull = (team?.players.length ?? 0) >= (settings?.max_players_per_team ?? 15);
          const loading = actionLoading === player.id;

          return (
            <Card key={player.id} className={`transition-all hover:border-stork-orange/30 ${owned ? "border-stork-orange/40 bg-stork-orange/5" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Badge className={PLAYER_ROLE_COLORS[player.role]} variant="outline">
                    {PLAYER_ROLE_LABELS[player.role]}
                  </Badge>
                  {owned && <Check className="w-4 h-4 text-stork-orange" />}
                </div>

                <p className="font-semibold text-foreground leading-tight">{player.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">{player.team}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-sm font-bold text-yellow-400">{player.price} SK</span>
                  </div>

                  {owned ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={loading || marketClosed}>
                          Vendi (+{player.price} SK)
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Vendere {player.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Riceverai {player.price} SK (prezzo intero). L&apos;operazione non è reversibile.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleSell(player)}>Vendi</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      size="sm"
                      disabled={loading || marketClosed || !canAfford || rosterFull}
                      onClick={() => handleBuy(player)}
                    >
                      {rosterFull ? "Rosa piena" : !canAfford ? "SK insufficienti" : "Acquista"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPlayers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Filter className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Nessun giocatore trovato</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
