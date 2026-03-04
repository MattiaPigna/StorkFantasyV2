"use client";

import { useEffect, useState, useCallback } from "react";
import { LayoutGrid, Save, Lock, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPlayers } from "@/lib/db/players";
import { getMyTeam, updateLineup } from "@/lib/db/teams";
import { getAppSettings } from "@/lib/db/settings";
import { getPitchPositions } from "@/lib/pitch-positions";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Player, UserTeam, AppSettings, LineupSlot } from "@/types";
import { cn } from "@/lib/utils";

export function LineupView() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [lineup, setLineup] = useState<LineupSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [pl, t, s] = await Promise.all([getPlayers(), getMyTeam(user.id), getAppSettings()]);
      setPlayers(pl);
      setTeam(t);
      setSettings(s);
      const size = s?.lineup_size ?? 11;
      if (t?.lineup && t.lineup.length === size) {
        setLineup(t.lineup);
      } else {
        setLineup(Array.from({ length: size }, (_, i) => ({ position: i, player_id: null })));
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const lineupSize = settings?.lineup_size ?? 11;
  const pitchPositions = getPitchPositions(lineupSize);
  const locked = settings?.lineup_locked ?? false;
  const myPlayers = players.filter((p) => team?.players.includes(p.id));

  const getPlayerInSlot = useCallback((slotIdx: number): Player | null => {
    const slot = lineup[slotIdx];
    if (!slot?.player_id) return null;
    return players.find((p) => p.id === slot.player_id) ?? null;
  }, [lineup, players]);

  const playersInLineup = lineup.map((s) => s.player_id).filter(Boolean);
  const filledSlots = playersInLineup.length;

  function handleSlotClick(slotIdx: number) {
    if (locked) return;
    setSelectedSlot(slotIdx === selectedSlot ? null : slotIdx);
  }

  function handlePlayerSelect(playerId: string) {
    if (selectedSlot === null || locked) return;
    setLineup((prev) => {
      const newLineup = [...prev];
      const otherIdx = newLineup.findIndex((s) => s.player_id === playerId && s.position !== selectedSlot);
      if (otherIdx !== -1) newLineup[otherIdx] = { ...newLineup[otherIdx], player_id: null };
      newLineup[selectedSlot] = { ...newLineup[selectedSlot], player_id: playerId };
      return newLineup;
    });
    setSelectedSlot(null);
  }

  function handleRemoveFromSlot(slotIdx: number) {
    if (locked) return;
    setLineup((prev) => {
      const newLineup = [...prev];
      newLineup[slotIdx] = { ...newLineup[slotIdx], player_id: null };
      return newLineup;
    });
  }

  async function handleSave() {
    if (!team || locked) return;
    setIsSaving(true);
    try {
      await updateLineup(team.id, lineup);
      toast({ title: "Formazione salvata!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore nel salvataggio" });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-6 h-6 text-stork-orange" />
          <div>
            <h1 className="text-2xl font-black">Il Mio Campo</h1>
            <p className="text-xs text-muted-foreground">{filledSlots}/{lineupSize} titolari schierati</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {locked && <Badge variant="warning" className="gap-1"><Lock className="w-3 h-3" /> Bloccata</Badge>}
          <Button onClick={handleSave} disabled={isSaving || locked} size="sm">
            <Save className="w-4 h-4" />
            {isSaving ? "Salvataggio..." : "Salva"}
          </Button>
        </div>
      </div>

      {locked && (
        <div className="bg-stork-gold/10 border border-stork-gold/30 rounded-xl p-3 flex items-center gap-2 text-sm text-stork-gold">
          <Info className="w-4 h-4 shrink-0" />
          La formazione è bloccata per questa giornata.
        </div>
      )}

      {selectedSlot !== null && (
        <div className="bg-stork-orange/10 border border-stork-orange/30 rounded-xl p-3 flex items-center gap-2 text-sm text-stork-orange animate-fade-in">
          <Info className="w-4 h-4 shrink-0" />
          Seleziona un giocatore dalla lista per inserirlo nella posizione {selectedSlot + 1}. Click sulla posizione per deselezionare.
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_260px] gap-5">
        {/* Pitch */}
        <Card className="overflow-hidden border-emerald-900/30">
          <CardContent className="p-0">
            <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingBottom: "130%" }}>
              {/* Grass gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950" />
              {/* Pitch lines */}
              <div className="absolute inset-[3%] border-2 border-white/15 rounded-sm" />
              <div className="absolute left-[3%] right-[3%] top-1/2 border-t border-white/10" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[15%] h-0 pb-[15%] border-2 border-white/10 rounded-full" />
              <div className="absolute top-[3%] left-[25%] right-[25%] h-[10%] border-2 border-white/10 border-t-0" />
              <div className="absolute bottom-[3%] left-[25%] right-[25%] h-[10%] border-2 border-white/10 border-b-0" />

              {/* Player slots */}
              {pitchPositions.map((pos, i) => {
                const player = getPlayerInSlot(i);
                const isSelected = selectedSlot === i;
                return (
                  <button
                    key={i}
                    className={cn(
                      "absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 transition-all duration-200",
                      !locked && "cursor-pointer hover:scale-110",
                      locked && "cursor-default"
                    )}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    onClick={() => handleSlotClick(i)}
                  >
                    <div className={cn(
                      "w-11 h-11 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all shadow-lg",
                      player
                        ? "bg-gradient-to-br from-stork-orange to-stork-gold-dark border-stork-gold text-black shadow-glow-gold"
                        : "bg-black/50 text-white/40 border-white/15",
                      isSelected && "border-stork-gold scale-125 shadow-glow-gold animate-pulse-glow"
                    )}>
                      {player ? player.name.slice(0, 2).toUpperCase() : pos.label.slice(0, 1)}
                    </div>
                    {player && (
                      <div className="bg-black/80 border border-stork-gold/20 rounded-md px-1.5 py-0.5 text-[9px] text-white max-w-[64px] truncate text-center">
                        {player.name.split(" ").slice(-1)[0]}
                      </div>
                    )}
                    {player && !locked && (
                      <button
                        className="absolute -top-1 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center hover:scale-125 transition-transform shadow"
                        onClick={(e) => { e.stopPropagation(); handleRemoveFromSlot(i); }}
                      >×</button>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Player list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">
              {selectedSlot !== null
                ? <span className="text-stork-orange font-bold">▶ Seleziona giocatore</span>
                : `La tua rosa (${myPlayers.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-[520px] overflow-y-auto space-y-0.5">
            {myPlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Non hai giocatori. Vai al Mercato!</p>
            ) : (
              myPlayers.map((player) => {
                const inLineup = playersInLineup.includes(player.id);
                const isClickable = selectedSlot !== null && !locked;
                return (
                  <button
                    key={player.id}
                    onClick={() => isClickable && handlePlayerSelect(player.id)}
                    disabled={locked || selectedSlot === null}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all",
                      isClickable ? "hover:bg-stork-orange/10 cursor-pointer hover:border-stork-orange/30 border border-transparent" : "cursor-default",
                      inLineup && "bg-stork-dark border border-stork-dark-border"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full text-[10px] font-black flex items-center justify-center shrink-0",
                      inLineup ? "bg-gradient-to-br from-stork-orange to-stork-gold-dark text-black" : "bg-stork-dark text-muted-foreground border border-stork-dark-border"
                    )}>
                      {player.role}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{player.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{player.team}</p>
                    </div>
                    {inLineup && <div className="w-2 h-2 rounded-full bg-stork-orange shrink-0 shadow-glow-orange" />}
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
