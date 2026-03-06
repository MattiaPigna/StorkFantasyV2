"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Users, UserCog, Star, CreditCard, Trophy, Building, Settings, LogOut, ArrowLeft, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLeagueStore } from "@/store/league";

const adminNavItems = [
  { href: "/admin/members", label: "Membri", icon: Users },
  { href: "/admin/matchdays", label: "Giornate", icon: Calendar },
  { href: "/admin/players", label: "Giocatori", icon: UserCog },
  { href: "/admin/rules", label: "Regole Punti", icon: Star },
  { href: "/admin/cards", label: "Card Speciali", icon: CreditCard },
  { href: "/admin/tournament", label: "Torneo", icon: Trophy },
  { href: "/admin/sponsors", label: "Sponsor", icon: Building },
  { href: "/admin/settings", label: "Impostazioni", icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { activeLeague } = useLeagueStore();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast({ title: "Logout effettuato" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Tablet + Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-stork-dark-border bg-stork-dark-card fixed h-full z-20">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-stork-dark-border">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="font-black text-sm text-foreground">Area Admin</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest truncate max-w-[140px]">{activeLeague?.name ?? "StorkLeague"}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {adminNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                  active
                    ? "bg-gradient-to-r from-stork-orange to-stork-gold-dark text-black shadow-glow-orange"
                    : "text-muted-foreground hover:text-foreground hover:bg-stork-dark"
                )}
              >
                <item.icon className={cn("w-4 h-4 shrink-0", !active && "group-hover:text-stork-orange")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 border-t border-stork-dark-border pt-4 space-y-0.5">
          <Link href="/dashboard/home"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-stork-gold hover:bg-stork-dark transition-all">
            <ArrowLeft className="w-4 h-4" /> Torna alla Lega
          </Link>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" /> Esci
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-stork-dark-card/95 backdrop-blur-md border-b border-stork-dark-border z-20 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-400" />
            <span className="font-bold text-sm text-gradient">Admin Panel</span>
          </div>
          <Link href="/dashboard/home" className="text-xs text-muted-foreground flex items-center gap-1 hover:text-stork-orange">
            <ArrowLeft className="w-3 h-3" /> Lega
          </Link>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {adminNavItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                pathname === item.href
                  ? "bg-gradient-to-r from-stork-orange to-stork-gold-dark text-black"
                  : "bg-stork-dark text-muted-foreground border border-stork-dark-border"
              )}>
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <main className="flex-1 md:ml-64 pt-28 md:pt-0">{children}</main>
    </div>
  );
}
