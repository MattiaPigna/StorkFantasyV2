"use client";

import { useEffect, useState, useCallback } from "react";
import { LayoutGrid, Save, Lock, Info, Target, Zap, AlertTriangle, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPlayers } from "@/lib/db/players";
import { getMyTeam, updateLineup } from "@/lib/db/teams";
import { getAppSettings } from "@/lib/db/settings";
import { getMatchdays, getMatchdayStats } from "@/lib/db/matchdays";
import { useLeagueStore } from "@/store/league";
import { getPitchPositions } from "@/lib/pitch-positions";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Player, UserTeam, AppSettings, LineupSlot, PlayerMatchStats, Matchday } from "@/types";
import { cn } from "@/lib/utils";

export function LineupView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [players, setPlayers] = useState<Player[]>([]);
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [lineup, setLineup] = useState<LineupSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMatchday, setActiveMatchday] = useState<Matchday | null>(null);
  const [matchdayStats, setMatchdayStats] = useState<Record<string, PlayerMatchStats>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (!leagueId) return;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [pl, t, s, matchdays] = await Promise.all([
        getPlayers(leagueId),
        getMyTeam(user.id, leagueId),
        getAppSettings(leagueId),
        getMatchdays(leagueId),
      ]);
      setPlayers(pl);
      setTeam(t);
      setSettings(s);
      const size = s?.lineup_size ?? 11;
      if (t?.lineup && t.lineup.length === size) {
        setLineup(t.lineup);
      } else {
        setLineup(Array.from({ length: size }, (_, i) => ({ position: i, player_id: null })));
      }
      if (matchdays.length > 0) {
        const latest = matchdays[0];
        setActiveMatchday(latest);
        const stats = await getMatchdayStats(latest.id);
        setMatchdayStats(stats);
      }
      setIsLoading(false);
    }
    load();
  }, [leagueId]);

  const lineupSize = settings?.lineup_size ?? 11;
  const pitchSlots = getPitchPositions(lineupSize);
  const locked = settings?.lineup_locked ?? false;
  const myPlayers = players.filter((p) => team?.players.includes(p.id));
  const playersInLineup = lineup.map((s) => s.player_id).filter(Boolean);
  const filledSlots = playersInLineup.length;
  const benchPlayers = myPlayers.filter((p) => !playersInLineup.includes(p.id));

  const getPlayerInSlot = useCallback((slotIdx: number): Player | null => {
    const slot = lineup[slotIdx];
    if (!slot?.player_id) return null;
    return players.find((p) => p.id === slot.player_id) ?? null;
  }, [lineup, players]);

  function handleSlotClick(slotIdx: number) {
    if (locked) return;
    setSelectedSlot(slotIdx === selectedSlot ? null : slotIdx);
  }

  function handlePlayerSelect(playerId: string) {
    if (selectedSlot === null || locked) return;
    const isGKSlot = pitchSlots[selectedSlot]?.isGoalkeeper;
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    if (isGKSlot && player.role !== "P") {
      toast({ variant: "destructive", title: "Solo portieri in porta!", description: "Questo slot è riservato al portiere." });
      return;
    }
    if (!isGKSlot && player.role === "P") {
      toast({ variant: "destructive", title: "Il portiere va in porta!", description: "I portieri possono essere schierati solo nello slot portiere." });
      return;
    }
    setLineup((prev) => {
      const next = [...prev];
      const otherIdx = next.findIndex((s) => s.player_id === playerId && s.position !== selectedSlot);
      if (otherIdx !== -1) next[otherIdx] = { ...next[otherIdx], player_id: null };
      next[selectedSlot] = { ...next[selectedSlot], player_id: playerId };
      return next;
    });
    setSelectedSlot(null);
  }

  function handleRemoveFromSlot(slotIdx: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (locked) return;
    setLineup((prev) => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], player_id: null };
      return next;
    });
  }

  async function handleSave() {
    if (!team || locked) return;
    if (filledSlots < lineupSize) {
      toast({ variant: "destructive", title: "Formazione incompleta", description: `Devi schierare tutti i ${lineupSize} titolari prima di salvare.` });
      return;
    }
    setIsSaving(true);
    try {
      await updateLineup(team.id, lineup);
      toast({ title: "Formazione salvata!" });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
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
    <div className="p-4 lg:p-8 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-6 h-6 text-stork-orange" />
          <div>
            <h1 className="text-2xl font-black">Il Mio Campo</h1>
            <p className="text-xs text-muted-foreground">
              {filledSlots}/{lineupSize} titolari · {lineupSize === 1 ? "1 giocatore" : `formazione da ${lineupSize}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {locked && <Badge variant="warning" className="gap-1"><Lock className="w-3 h-3" />Bloccata</Badge>}
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
          Seleziona un giocatore dalla lista per la posizione {selectedSlot + 1}
          {pitchSlots[selectedSlot]?.isGoalkeeper ? " (Portiere)" : " (Giocatore di Movimento)"}.
        </div>
      )}

      {/* ===== PITCH ROW ===== */}
      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* PITCH — max-width per restare compatto in portrait */}
        <Card className="overflow-hidden border-emerald-900/30 w-full md:w-[440px] lg:w-[580px] xl:w-[660px] shrink-0">
          {/* Riquadro punteggio live */}
          {activeMatchday && (() => {
            const matchdayScore = team?.matchday_points?.[activeMatchday.id] ?? null;
            const isCalculated = activeMatchday.status === "calculated";
            return (
              <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-900/30 bg-gradient-to-r from-emerald-950/80 to-stork-dark">
                <div className="flex items-center gap-2">
                  {isCalculated
                    ? <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    : <span className="w-2 h-2 rounded-full bg-stork-orange animate-pulse" />}
                  <span className="text-xs font-semibold text-muted-foreground">{activeMatchday.name}</span>
                  <Badge variant={isCalculated ? "success" : "warning"} className="text-[10px]">
                    {isCalculated ? "Calcolata" : "In corso"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-stork-orange" />
                  {matchdayScore !== null ? (
                    <>
                      <span className="text-xl font-black text-stork-orange">
                        {matchdayScore > 0 ? `+${matchdayScore.toFixed(1)}` : matchdayScore.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">pt</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Non calcolata</span>
                  )}
                </div>
              </div>
            );
          })()}
          <CardContent className="p-0">
            <div
              className="relative w-full overflow-hidden rounded-b-xl"
              style={{ paddingBottom: `${Math.max(120, 90 + lineupSize * 3.5)}%` }}
            >
              {/* Erba */}
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-950 via-emerald-900/90 to-emerald-950 rounded-b-xl" />
              {/* Strisce del campo */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 bg-emerald-800/20"
                  style={{ top: `${i * 17}%`, height: "8.5%" }}
                />
              ))}
              {/* Linee campo */}
              <div className="absolute inset-[3%] border-2 border-white/15 rounded-sm" />
              <div className="absolute left-[3%] right-[3%] top-1/2 border-t border-white/10" />
              <div className="absolute left-1/2 top-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2 border-2 border-white/10 rounded-full" />
              {/* Area rigore alto */}
              <div className="absolute top-[3%] left-[28%] right-[28%] h-[9%] border-2 border-white/10 border-t-0" />
              {/* Area rigore basso */}
              <div className="absolute bottom-[3%] left-[28%] right-[28%] h-[9%] border-2 border-white/10 border-b-0" />

              {/* Slot giocatori */}
              {pitchSlots.map((slot, i) => {
                const player = getPlayerInSlot(i);
                const isSelected = selectedSlot === i;
                const isGK = slot.isGoalkeeper;
                const stats = player ? matchdayStats[player.id] : undefined;
                const hasPoints = stats?.fantasy_points != null;

                // Card dimensions: adapt to lineup size
                const cardW = lineupSize <= 8 ? 52 : lineupSize <= 11 ? 46 : 40;
                const cardH = Math.round(cardW * 1.35);
                const avatarH = Math.round(cardH * 0.65);
                const fontSize = lineupSize <= 8 ? 9 : 8;

                return (
                  <button
                    key={i}
                    type="button"
                    className={cn(
                      "absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-200 z-10",
                      !locked ? "cursor-pointer hover:scale-110 hover:z-20" : "cursor-default"
                    )}
                    style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                    onClick={() => handleSlotClick(i)}
                  >
                    {player ? (
                      /* ── Filled card ── */
                      <div style={{ position: "relative", width: cardW, filter: isSelected ? "drop-shadow(0 0 6px rgba(255,255,255,0.8))" : undefined }}>
                        {/* Card body */}
                        <div style={{
                          width: cardW, height: cardH,
                          borderRadius: 6,
                          overflow: "hidden",
                          boxShadow: isGK
                            ? "0 4px 12px rgba(217,119,6,0.5)"
                            : "0 4px 12px rgba(249,115,22,0.5)",
                          border: isSelected ? "2px solid rgba(255,255,255,0.9)" : `1.5px solid ${isGK ? "rgba(217,119,6,0.6)" : "rgba(249,115,22,0.6)"}`,
                        }}>
                          {/* Avatar area with silhouette */}
                          <div style={{
                            height: avatarH,
                            background: isGK
                              ? "linear-gradient(160deg, #92400e 0%, #d97706 100%)"
                              : "linear-gradient(160deg, #9a3412 0%, #f97316 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            position: "relative", overflow: "hidden",
                          }}>
                            {/* Background hex pattern */}
                            <div style={{
                              position: "absolute", inset: 0, opacity: 0.12,
                              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                              backgroundSize: "6px 6px",
                            }} />
                            {/* Player silhouette SVG */}
                            <svg
                              viewBox="0 0 40 56"
                              style={{ width: cardW * 0.72, height: avatarH * 0.9 }}
                              fill="white"
                            >
                              {/* Head */}
                              <circle cx="20" cy="8" r="6" opacity="0.95" />
                              {/* Torso */}
                              <path d="M12 16 C12 16 20 20 28 16 L30 34 H10 Z" opacity="0.9" />
                              {/* Left leg */}
                              <path d="M13 33 L11 50" stroke="white" strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.9" />
                              {/* Right leg */}
                              <path d="M27 33 L29 50" stroke="white" strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.9" />
                              {/* Left arm */}
                              <path d="M12 18 L5 30" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.85" />
                              {/* Right arm */}
                              <path d="M28 18 L35 30" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.85" />
                            </svg>
                            {/* Role badge top-left */}
                            <div style={{
                              position: "absolute", top: 2, left: 3,
                              fontSize: 7, fontWeight: 800, color: "rgba(0,0,0,0.7)",
                              background: "rgba(255,255,255,0.85)", borderRadius: 3,
                              padding: "1px 3px", lineHeight: 1.2,
                            }}>
                              {isGK ? "P" : "M"}
                            </div>
                            {/* Points badge top-right */}
                            {hasPoints && (
                              <div style={{
                                position: "absolute", top: 2, right: 3,
                                fontSize: 7, fontWeight: 800,
                                color: (stats!.fantasy_points ?? 0) >= 0 ? "#fff" : "#fca5a5",
                                background: (stats!.fantasy_points ?? 0) >= 0 ? "rgba(0,0,0,0.55)" : "rgba(220,38,38,0.5)",
                                borderRadius: 3, padding: "1px 3px", lineHeight: 1.2,
                              }}>
                                {(stats!.fantasy_points ?? 0) > 0 ? `+${stats!.fantasy_points}` : stats!.fantasy_points}
                              </div>
                            )}
                          </div>
                          {/* Name strip */}
                          <div style={{
                            height: cardH - avatarH,
                            background: "rgba(0,0,0,0.92)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            padding: "0 3px",
                          }}>
                            <span style={{
                              fontSize, fontWeight: 800, color: "#fff",
                              letterSpacing: "0.02em", textTransform: "uppercase",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              maxWidth: cardW - 6,
                            }}>
                              {player.name.split(" ").slice(-1)[0]}
                            </span>
                          </div>
                        </div>
                        {/* Remove button */}
                        {!locked && (
                          <div
                            role="button"
                            tabIndex={0}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-400 rounded-full text-white text-[10px] font-bold flex items-center justify-center transition-all hover:scale-125 shadow cursor-pointer z-30"
                            onClick={(e) => handleRemoveFromSlot(i, e)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleRemoveFromSlot(i, e as unknown as React.MouseEvent); }}
                          >×</div>
                        )}
                      </div>
                    ) : (
                      /* ── Empty slot ── */
                      <div style={{
                        width: cardW, height: cardH,
                        borderRadius: 6,
                        border: isSelected
                          ? "2px solid rgba(255,255,255,0.8)"
                          : `1.5px dashed ${isGK ? "rgba(217,119,6,0.4)" : "rgba(255,255,255,0.2)"}`,
                        background: isSelected
                          ? "rgba(255,255,255,0.1)"
                          : isGK ? "rgba(217,119,6,0.06)" : "rgba(0,0,0,0.3)",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: 2,
                        boxShadow: isSelected ? "0 0 12px rgba(255,255,255,0.3)" : undefined,
                      }}>
                        <span style={{
                          fontSize: cardW <= 40 ? 14 : 18,
                          color: isGK ? "rgba(217,119,6,0.5)" : "rgba(255,255,255,0.3)",
                          fontWeight: 300, lineHeight: 1,
                        }}>+</span>
                        <span style={{
                          fontSize: 7, fontWeight: 700,
                          color: isGK ? "rgba(217,119,6,0.5)" : "rgba(255,255,255,0.25)",
                          textTransform: "uppercase", letterSpacing: "0.05em",
                        }}>{isGK ? "POR" : "MV"}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ===== PLAYER PICKER — appare a lato quando si seleziona uno slot ===== */}
        {selectedSlot !== null && !locked && (
          <Card className="flex-1 min-w-0 animate-fade-in">
            <CardHeader className="pb-2 border-b border-stork-dark-border">
              <CardTitle className="text-sm">
                <span className="text-stork-orange font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-stork-orange animate-pulse" />
                  {pitchSlots[selectedSlot]?.isGoalkeeper ? "Seleziona Portiere" : "Seleziona Giocatore"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 max-h-[520px] overflow-y-auto space-y-0.5">
              {(() => {
                const isGKSlot = pitchSlots[selectedSlot]?.isGoalkeeper;
                const eligible = myPlayers.filter(p => isGKSlot ? p.role === "P" : p.role === "M");
                if (myPlayers.length === 0) return (
                  <p className="text-sm text-muted-foreground text-center py-8 px-4">
                    Non hai giocatori.<br />Vai al Mercato per acquistarne!
                  </p>
                );
                if (eligible.length === 0) return (
                  <p className="text-sm text-muted-foreground text-center py-8 px-4">
                    {isGKSlot ? "Nessun portiere in rosa" : "Nessun giocatore di movimento in rosa"}
                  </p>
                );
                return eligible.map(player => (
                  <PlayerListItem key={player.id} player={player} inLineup={playersInLineup.includes(player.id)} isClickable onSelect={handlePlayerSelect} />
                ));
              })()}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== TITOLARI + PANCHINA ===== */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Titolari */}
        <Card>
          <CardHeader className="pb-2 border-b border-stork-dark-border">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="text-stork-orange font-bold">Titolari</span>
              <Badge variant="outline" className="text-[10px]">{filledSlots}/{lineupSize}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {playersInLineup.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nessun titolare schierato</p>
            ) : (
              playersInLineup.map((pid) => {
                const p = players.find((pl) => pl.id === pid);
                if (!p) return null;
                return <StatsRow key={p.id} player={p} stats={matchdayStats[p.id]} highlight />;
              })
            )}
          </CardContent>
        </Card>

        {/* Panchina */}
        <Card>
          <CardHeader className="pb-2 border-b border-stork-dark-border">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="text-muted-foreground font-bold">Panchina</span>
              <Badge variant="outline" className="text-[10px]">{benchPlayers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {benchPlayers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                {myPlayers.length === 0 ? "Nessun giocatore in rosa" : "Tutti i giocatori sono in campo"}
              </p>
            ) : (
              benchPlayers.map((p) => (
                <StatsRow key={p.id} player={p} stats={matchdayStats[p.id]} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsRow({ player, stats, highlight }: {
  player: Player;
  stats?: PlayerMatchStats;
  highlight?: boolean;
}) {
  const hasStats = stats && (
    stats.vote !== null ||
    (stats.goals ?? 0) > 0 ||
    (stats.assists ?? 0) > 0 ||
    (stats.bonus_points ?? 0) > 0 ||
    (stats.fantasy_points !== null && stats.fantasy_points !== undefined)
  );
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 border-b border-stork-dark-border last:border-0",
      highlight && "bg-stork-orange/5"
    )}>
      <div className={cn(
        "w-6 h-6 rounded-full text-[9px] font-black flex items-center justify-center shrink-0",
        player.role === "P" ? "bg-stork-gold/20 text-stork-gold" : "bg-stork-orange/20 text-stork-orange"
      )}>
        {player.role}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{player.name}</p>
        <p className="text-[10px] text-muted-foreground">{player.team}</p>
      </div>
      {hasStats ? (
        <div className="flex items-center gap-2 shrink-0">
          {stats.vote !== null && (
            <div className={cn("text-xs font-black px-1.5 py-0.5 rounded", stats.vote >= 7 ? "text-emerald-400 bg-emerald-400/10" : stats.vote <= 4 ? "text-red-400 bg-red-400/10" : "text-foreground bg-muted")}>
              {stats.vote}
            </div>
          )}
          {(stats.goals ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-stork-orange font-bold">
              <Target className="w-3 h-3" />{stats.goals}
            </span>
          )}
          {(stats.assists ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-blue-400 font-bold">
              <Zap className="w-3 h-3" />{stats.assists}
            </span>
          )}
          {(stats.yellow_cards ?? 0) > 0 && <AlertTriangle className="w-3 h-3 text-yellow-400" />}
          {(stats.red_cards ?? 0) > 0 && <AlertTriangle className="w-3 h-3 text-red-400" />}
          {(stats.bonus_points ?? 0) > 0 && (
            <span className="text-[10px] text-emerald-400 font-bold">+{stats.bonus_points}B</span>
          )}
          {(stats.malus_points ?? 0) > 0 && (
            <span className="text-[10px] text-red-400 font-bold">-{stats.malus_points}M</span>
          )}
          {stats.fantasy_points !== null && stats.fantasy_points !== undefined && (
            <span className={cn("text-xs font-black ml-1", stats.fantasy_points > 0 ? "text-stork-orange" : "text-muted-foreground")}>
              {stats.fantasy_points > 0 ? `+${stats.fantasy_points}` : stats.fantasy_points}pt
            </span>
          )}
        </div>
      ) : (
        <span className="text-[10px] text-muted-foreground shrink-0">—</span>
      )}
    </div>
  );
}

function PlayerListItem({ player, inLineup, isClickable, onSelect }: {
  player: Player;
  inLineup: boolean;
  isClickable: boolean;
  onSelect: (id: string) => void;
}) {
  const isGK = player.role === "P";
  return (
    <button
      type="button"
      onClick={() => isClickable && onSelect(player.id)}
      disabled={!isClickable}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all",
        isClickable
          ? "hover:bg-stork-orange/10 hover:border-stork-orange/30 border border-transparent cursor-pointer"
          : "cursor-default",
        inLineup && "bg-stork-dark border border-stork-dark-border"
      )}
    >
      <div className={cn(
        "w-7 h-7 rounded-full text-[10px] font-black flex items-center justify-center shrink-0",
        isGK
          ? inLineup ? "bg-gradient-to-br from-stork-gold to-stork-gold-dark text-black" : "bg-stork-gold/10 text-stork-gold border border-stork-gold/30"
          : inLineup ? "bg-gradient-to-br from-stork-orange to-stork-gold-dark text-black" : "bg-stork-dark text-muted-foreground border border-stork-dark-border"
      )}>
        {isGK ? "P" : "M"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{player.name}</p>
        <p className="text-[10px] text-muted-foreground">{player.team}</p>
      </div>
      {inLineup && <div className={cn("w-2 h-2 rounded-full shrink-0", isGK ? "bg-stork-gold shadow-glow-gold" : "bg-stork-orange shadow-glow-orange")} />}
    </button>
  );
}
