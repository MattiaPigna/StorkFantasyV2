"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ShoppingCart, Search, Filter, Coins, Check, X,
  ArrowUpDown, ArrowUp, ArrowDown, Users, Tag, ChevronLeft, ChevronRight,
  Plus, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { getPlayers } from "@/lib/db/players";
import { getMyTeam, buyPlayer, sellPlayer } from "@/lib/db/teams";
import { getAppSettings } from "@/lib/db/settings";
import { getMarketListings, createListing, cancelListing, buyFromListing } from "@/lib/db/market";
import { useLeagueStore } from "@/store/league";
import { formatCredits } from "@/lib/utils";
import { PLAYER_ROLE_LABELS, PLAYER_ROLE_COLORS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Player, UserTeam, AppSettings, MarketListing } from "@/types";

type FilterRole = "ALL" | "P" | "M";
type SortPrice = "none" | "asc" | "desc";
type Tab = "mercato" | "p2p";

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// MarketView
// ---------------------------------------------------------------------------
export function MarketView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [players, setPlayers] = useState<Player[]>([]);
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Admin-market filters
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<FilterRole>("ALL");
  const [filterTeam, setFilterTeam] = useState<string>("ALL");
  const [sortPrice, setSortPrice] = useState<SortPrice>("none");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("mercato");
  const { toast } = useToast();

  useEffect(() => {
    if (!leagueId) return;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const [pl, t, s] = await Promise.all([
        getPlayers(leagueId),
        getMyTeam(user.id, leagueId),
        getAppSettings(leagueId),
      ]);
      setPlayers(pl);
      setTeam(t);
      setSettings(s);
      setIsLoading(false);
    }
    load();
  }, [leagueId]);

  // Reset page when filters change
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
      setTeam((prev) =>
        prev ? { ...prev, players: [...prev.players, player.id], credits: prev.credits - player.price } : prev
      );
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
      setTeam((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.filter((id) => id !== player.id),
          credits: prev.credits + player.price,
          lineup: (prev.lineup ?? []).map((slot) =>
            slot.player_id === player.id ? { ...slot, player_id: null } : slot
          ),
        };
      });
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

  const marketClosed = !settings?.market_open;

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

      {/* Tab switcher */}
      <div className="flex rounded-xl bg-stork-dark p-1 border border-stork-dark-border w-fit">
        {([
          { key: "mercato", label: "Mercato", icon: ShoppingCart },
          { key: "p2p", label: "P2P", icon: Users },
        ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              tab === key
                ? "bg-gradient-to-r from-stork-orange to-stork-gold-dark text-black shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ===== ADMIN MARKET TAB ===== */}
      {tab === "mercato" && (
        <>
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
                  { key: "asc", label: "↑ Prezzo", icon: ArrowUp },
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

              <span className="text-xs text-muted-foreground ml-auto">
                {filteredPlayers.length} giocatori
              </span>
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
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
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
        </>
      )}

      {/* ===== P2P TAB ===== */}
      {tab === "p2p" && team && userId && (
        <P2PTab
          leagueId={leagueId}
          team={team}
          settings={settings}
          userId={userId}
          players={players}
          onTeamChange={setTeam}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// P2P Tab
// ---------------------------------------------------------------------------

function P2PTab({
  leagueId,
  team,
  settings,
  userId,
  players,
  onTeamChange,
}: {
  leagueId: string;
  team: UserTeam;
  settings: AppSettings | null;
  userId: string;
  players: Player[];
  onTeamChange: (t: UserTeam) => void;
}) {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create-listing dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [createPlayerId, setCreatePlayerId] = useState<string>("");
  const [createPrice, setCreatePrice] = useState<string>("");
  const [createLoading, setCreateLoading] = useState(false);

  const { toast } = useToast();
  const marketClosed = !settings?.market_open;
  const maxRoster = settings?.max_players_per_team ?? 15;

  useEffect(() => {
    loadListings();
  }, [leagueId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadListings() {
    setLoading(true);
    try {
      setListings(await getMarketListings(leagueId));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  // Players in my roster that I haven't already listed
  const myListedIds = new Set(listings.filter((l) => l.seller_id === userId).map((l) => l.player_id));
  const availableForSale = players.filter((p) => team.players.includes(p.id) && !myListedIds.has(p.id));

  async function handleCreate() {
    if (!createPlayerId || !createPrice) return;
    const price = parseInt(createPrice, 10);
    if (isNaN(price) || price <= 0) {
      toast({ variant: "destructive", title: "Prezzo non valido" });
      return;
    }
    setCreateLoading(true);
    try {
      await createListing(leagueId, userId, team.id, createPlayerId, price);
      toast({ title: "Annuncio pubblicato!" });
      setShowCreate(false);
      setCreatePlayerId("");
      setCreatePrice("");
      await loadListings();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleCancel(listingId: string) {
    setActionLoading(listingId);
    try {
      await cancelListing(listingId);
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      toast({ title: "Annuncio rimosso" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBuy(listing: MarketListing) {
    setActionLoading(listing.id);
    try {
      await buyFromListing(listing.id, team.id, team.players, team.credits, maxRoster);
      const player = players.find((p) => p.id === listing.player_id);
      onTeamChange({
        ...team,
        players: [...team.players, listing.player_id],
        credits: team.credits - listing.price,
      });
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
      toast({ title: "Acquisto completato!", description: player ? `${player.name} è nella tua rosa.` : undefined });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Create listing button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{listings.length} annunci attivi</p>
        <Button
          size="sm"
          disabled={marketClosed || availableForSale.length === 0}
          onClick={() => { setShowCreate(true); setCreatePlayerId(availableForSale[0]?.id ?? ""); }}
        >
          <Plus className="w-4 h-4" />
          Metti in Vendita
        </Button>
      </div>

      {/* Create listing dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Metti in vendita</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Giocatore</label>
              <select
                value={createPlayerId}
                onChange={(e) => setCreatePlayerId(e.target.value)}
                className="w-full bg-stork-dark border border-stork-dark-border text-sm text-foreground rounded-lg px-3 py-2 outline-none focus:border-stork-orange/50"
              >
                {availableForSale.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.team}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prezzo (SK)</label>
              <Input
                type="number"
                min={1}
                placeholder="es. 25"
                value={createPrice}
                onChange={(e) => setCreatePrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={createLoading || !createPlayerId || !createPrice}>
              {createLoading ? "Pubblicazione..." : "Pubblica"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Listings */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Nessun annuncio attivo</p>
          <p className="text-xs mt-1">Sii il primo a mettere un giocatore in vendita!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {listings.map((listing) => {
            const player = players.find((p) => p.id === listing.player_id) ?? listing.player;
            const isMine = listing.seller_id === userId;
            const canAfford = team.credits >= listing.price;
            const rosterFull = team.players.length >= maxRoster;
            const alreadyOwned = team.players.includes(listing.player_id);
            const isLoading = actionLoading === listing.id;

            return (
              <Card
                key={listing.id}
                className={cn(
                  "transition-all",
                  isMine && "border-stork-orange/40 bg-stork-orange/5"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    {player && (
                      <Badge className={PLAYER_ROLE_COLORS[player.role]} variant="outline">
                        {PLAYER_ROLE_LABELS[player.role]}
                      </Badge>
                    )}
                    {isMine && <Badge variant="warning" className="text-[10px]">Tuo annuncio</Badge>}
                  </div>

                  <p className="font-semibold leading-tight">{player?.name ?? listing.player_id}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{player?.team}</p>

                  <div className="flex items-center gap-1.5 mt-2 mb-1">
                    <p className="text-xs text-muted-foreground">
                      Venduto da <span className="text-foreground font-medium">
                        {listing.seller?.manager_name ?? "Utente"}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-sm font-bold text-yellow-400">{listing.price} SK</span>
                    </div>

                    {isMine ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleCancel(listing.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Ritira
                      </Button>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            disabled={isLoading || marketClosed || !canAfford || rosterFull || alreadyOwned}
                          >
                            {alreadyOwned ? "Già in rosa" : rosterFull ? "Rosa piena" : !canAfford ? "SK insufficienti" : "Acquista"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Acquistare {player?.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Spenderai {listing.price} SK. I crediti verranno trasferiti al venditore.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleBuy(listing)}>Acquista</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
