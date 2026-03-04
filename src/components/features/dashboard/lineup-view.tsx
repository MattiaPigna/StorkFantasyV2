"use client";

import { useEffect, useState, useCallback } from "react";
import { LayoutGrid, Save, Lock, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPlayers } from "@/lib/db/players";
import { getMyTeam, updateLineup } from "@/lib/db/teams";
import { getAppSettings } from "@/lib/db/settings";
import { PLAYER_ROLE_LABELS, PLAYER_ROLE_COLORS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Player, UserTeam, AppSettings, LineupSlot } from "@/types";
import { cn } from "@/lib/utils";

// Pitch positions (x%, y%) for 4-3-3 formation
const PITCH_POSITIONS: { x: number; y: number; label: string }[] = [
  // GK
  { x: 50, y: 88, label: "POR" },
  // Defenders
  { x: 15, y: 70, label: "DIF" },
  { x: 38, y: 70, label: "DIF" },
  { x: 62, y: 70, label: "DIF" },
  { x: 85, y: 70, label: "DIF" },
  // Midfielders
  { x: 25, y: 48, label: "CEN" },
  { x: 50, y: 48, label: "CEN" },
  { x: 75, y: 48, label: "CEN" },
  // Forwards
  { x: 20, y: 22, label: "ATT" },
  { x: 50, y: 22, label: "ATT" },
  { x: 80, y: 22, label: "ATT" },
];

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

      const [pl, t, s] = await Promise.all([
        getPlayers(),
        getMyTeam(user.id),
        getAppSettings(),
      ]);

      setPlayers(pl);
      setTeam(t);
      setSettings(s);

      if (t?.lineup && t.lineup.length > 0) {
        setLineup(t.lineup);
      } else {
        setLineup(PITCH_POSITIONS.map((_, i) => ({ position: i, player_id: null })));
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const locked = settings?.lineup_locked ?? false;

  const myPlayers = players.filter((p) => team?.players.includes(p.id));

  const getPlayerInSlot = useCallback((slotIdx: number): Player | null => {
    const slot = lineup[slotIdx];
    if (!slot?.player_id) return null;
    return players.find((p) => p.id === slot.player_id) ?? null;
  }, [lineup, players]);

  const playersInLineup = lineup.map((s) => s.player_id).filter(Boolean);

  function handleSlotClick(slotIdx: number) {
    if (locked) return;
    setSelectedSlot(slotIdx === selectedSlot ? null : slotIdx);
  }

  function handlePlayerSelect(playerId: string) {
    if (selectedSlot === null || locked) return;

    setLineup((prev) => {
      const newLineup = [...prev];
      // Remove player from any other slot first
      const otherSlotIdx = newLineup.findIndex((s) => s.player_id === playerId && s.position !== selectedSlot);
      if (otherSlotIdx !== -1) newLineup[otherSlotIdx] = { ...newLineup[otherSlotIdx], player_id: null };
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
      toast({ title: "Formazione salvata!", description: "La tua formazione è stata aggiornata." });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore nel salvataggio" });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-6 h-6 text-stork-orange" />
          <h1 className="text-2xl font-bold">Il Mio Campo</h1>
        </div>
        <div className="flex items-center gap-2">
          {locked && (
            <Badge variant="warning" className="gap-1">
              <Lock className="w-3 h-3" />
              Bloccata
            </Badge>
          )}
          <Button onClick={handleSave} disabled={isSaving || locked} size="sm">
            <Save className="w-4 h-4" />
            {isSaving ? "Salvataggio..." : "Salva"}
          </Button>
        </div>
      </div>

      {locked && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center gap-2 text-sm text-yellow-400">
          <Info className="w-4 h-4 shrink-0" />
          La formazione è bloccata per questa giornata.
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_280px] gap-5">
        {/* Pitch */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div
              className="relative w-full bg-gradient-to-b from-green-900/80 to-green-800/80 rounded-xl overflow-hidden"
              style={{ paddingBottom: "140%" }}
            >
              {/* Pitch markings */}
              <div className="absolute inset-4 border-2 border-white/20 rounded" />
              <div className="absolute left-4 right-4 top-1/2 border-t border-white/20" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white/20 rounded-full" />
              {/* Goal boxes */}
              <div className="absolute top-4 left-1/4 right-1/4 h-12 border-2 border-white/20 border-t-0" />
              <div className="absolute bottom-4 left-1/4 right-1/4 h-12 border-2 border-white/20 border-b-0" />

              {/* Player slots */}
              {PITCH_POSITIONS.map((pos, i) => {
                const player = getPlayerInSlot(i);
                const isSelected = selectedSlot === i;

                return (
                  <button
                    key={i}
                    className={cn(
                      "absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 transition-all",
                      !locked && "cursor-pointer hover:scale-110",
                      locked && "cursor-default"
                    )}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    onClick={() => handleSlotClick(i)}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all",
                      player
                        ? "gradient-stork text-white border-stork-orange"
                        : "bg-black/40 text-white/50 border-white/20",
                      isSelected && "border-yellow-400 scale-110 shadow-[0_0_12px_rgba(234,179,8,0.5)]"
                    )}>
                      {player ? player.name.slice(0, 2).toUpperCase() : pos.label.slice(0, 1)}
                    </div>
                    {player && (
                      <div className="bg-black/70 rounded px-1.5 py-0.5 text-[10px] text-white max-w-[70px] truncate text-center">
                        {player.name.split(" ")[0]}
                      </div>
                    )}
                    {player && !locked && (
                      <button
                        className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-white text-[8px] flex items-center justify-center hover:scale-125 transition-transform"
                        onClick={(e) => { e.stopPropagation(); handleRemoveFromSlot(i); }}
                      >
                        ×
                      </button>
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
            <CardTitle className="text-sm">
              {selectedSlot !== null
                ? `Seleziona per posizione ${selectedSlot + 1}`
                : "La tua rosa"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-[500px] overflow-y-auto">
            {myPlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Non hai giocatori. Vai al Mercato!
              </p>
            ) : (
              <div className="space-y-1">
                {myPlayers.map((player) => {
                  const inLineup = playersInLineup.includes(player.id);
                  return (
                    <button
                      key={player.id}
                      onClick={() => selectedSlot !== null && handlePlayerSelect(player.id)}
                      disabled={locked || selectedSlot === null}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all",
                        selectedSlot !== null && !locked
                          ? "hover:bg-stork-orange/10 cursor-pointer"
                          : "cursor-default",
                        inLineup && "bg-muted",
                      )}
                    >
                      <div className={cn("w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0",
                        inLineup ? "gradient-stork text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {player.role}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{player.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{player.team}</p>
                      </div>
                      {inLineup && <div className="w-1.5 h-1.5 rounded-full bg-stork-orange shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
