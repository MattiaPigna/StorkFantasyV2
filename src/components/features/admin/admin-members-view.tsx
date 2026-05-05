"use client";

import { useEffect, useState } from "react";
import { Users, Trash2, Crown, Calendar, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getLeagueMembers, kickMember, type LeagueMemberDetail } from "@/lib/db/leagues";
import { useLeagueStore } from "@/store/league";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { deleteUserCompletely } from "@/app/actions/users";

export function AdminMembersView() {
  const { activeLeague } = useLeagueStore();
  const leagueId = activeLeague?.id ?? "";

  const [members, setMembers] = useState<LeagueMemberDetail[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!leagueId) return;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
      const m = await getLeagueMembers(leagueId);
      setMembers(m);
      setIsLoading(false);
    }
    load().catch(() => setIsLoading(false));
  }, [leagueId]);

  async function handleKick(userId: string, teamName: string) {
    try {
      const { error } = await deleteUserCompletely(userId);
      if (error) throw new Error(error);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      toast({ title: `${teamName} eliminato`, description: "Account rimosso da Supabase." });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore" });
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-stork-orange" />
        <h1 className="text-2xl font-bold">Membri della Lega</h1>
        <Badge variant="secondary">{members.length} iscritti</Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nessun membro</p>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lista Membri</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-stork-dark-border">
              {members.map((member) => {
                const isOwner = member.user_id === activeLeague?.owner_id;
                const isMe = member.user_id === currentUserId;
                const profileMissing = member.team_name === "—" && member.manager_name === "—";
                return (
                  <div key={member.user_id} className={`flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors ${profileMissing ? "bg-red-500/5" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${profileMissing ? "bg-red-500/20 border border-red-500/30" : "bg-gradient-to-br from-stork-orange/20 to-stork-gold/20 border border-stork-orange/20"}`}>
                        {profileMissing
                          ? <AlertTriangle className="w-4 h-4 text-red-400" />
                          : <span className="text-xs font-black text-stork-orange">{member.team_name.charAt(0).toUpperCase()}</span>
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold truncate ${profileMissing ? "text-red-400" : ""}`}>
                            {profileMissing ? "Profilo mancante" : member.team_name}
                          </p>
                          {profileMissing && (
                            <Badge variant="destructive" className="text-[10px]">Da eliminare</Badge>
                          )}
                          {isOwner && !profileMissing && (
                            <Badge variant="outline" className="text-[10px] border-stork-orange/40 text-stork-orange flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5" /> Owner
                            </Badge>
                          )}
                          {isMe && !isOwner && !profileMissing && (
                            <Badge variant="outline" className="text-[10px]">Tu</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <p className="text-xs text-muted-foreground">
                            {profileMissing ? member.user_id.slice(0, 16) + "…" : member.manager_name}
                          </p>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(member.joined_at).toLocaleDateString("it-IT")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-stork-orange">{member.total_points} pt</span>
                      {!isOwner && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminare {member.team_name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                L&apos;account di {member.manager_name} verrà eliminato definitivamente da Supabase. Non potrà più accedere all&apos;app. Azione irreversibile.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleKick(member.user_id, member.team_name)}
                                className="bg-destructive"
                              >
                                Elimina account
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
