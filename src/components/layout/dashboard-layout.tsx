"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, Trophy, BookOpen, LogOut, Shield, User, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MarqueeBanner } from "@/components/features/marquee-banner";
import { useEffect, useState } from "react";
import { getAppSettings } from "@/lib/db/settings";
import { getMyLeagues } from "@/lib/db/leagues";
import { useLeagueStore } from "@/store/league";
import type { AppSettings } from "@/types";

const navItems = [
  { href: "/dashboard/home", label: "Home", icon: Home },
  { href: "/dashboard/lineup", label: "Il Mio Campo", icon: LayoutGrid },
  { href: "/dashboard/market", label: "Mercato", icon: ShoppingCart },
  { href: "/dashboard/standings", label: "Classifica", icon: Trophy },
  { href: "/dashboard/fixtures", label: "Torneo", icon: Trophy },
  { href: "/dashboard/rules", label: "Regole", icon: BookOpen },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { activeLeague, myLeagues, setActiveLeague, setMyLeagues } = useLeagueStore();
  const [showLeaguePicker, setShowLeaguePicker] = useState(false);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load leagues if not in store
      if (myLeagues.length === 0) {
        const leagues = await getMyLeagues(user.id);
        setMyLeagues(leagues);
        if (!activeLeague && leagues.length > 0) {
          setActiveLeague(leagues[0]);
        } else if (leagues.length === 0) {
          router.push("/league/setup");
          return;
        }
      }

      // Check admin status
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      setIsAdmin(profile?.is_admin ?? false);

      // Load settings for active league
      if (activeLeague) {
        getAppSettings(activeLeague.id).then(setSettings).catch(() => null);
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLeague?.id]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    useLeagueStore.getState().reset();
    toast({ title: "Arrivederci!" });
    router.push("/");
    router.refresh();
  }


  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Tablet + Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-stork-dark-border bg-stork-dark-card fixed h-full z-20">
        {/* Logo + League selector */}
        <div className="px-5 py-5 border-b border-stork-dark-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stork-orange to-stork-gold-dark flex items-center justify-center shadow-glow-orange shrink-0">
              <Trophy className="w-5 h-5 text-black" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-sm text-gradient truncate">{activeLeague?.name ?? "StorkLeague"}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Fantacalcio</p>
            </div>
          </div>

          {/* League switcher */}
          {myLeagues.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowLeaguePicker(!showLeaguePicker)}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-stork-dark border border-stork-dark-border text-xs text-muted-foreground hover:text-foreground transition-all"
              >
                <span className="truncate">{activeLeague?.name}</span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>
              {showLeaguePicker && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-stork-dark-card border border-stork-dark-border rounded-xl shadow-card z-50 overflow-hidden">
                  {myLeagues.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => { setActiveLeague(l); setShowLeaguePicker(false); router.refresh(); }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs hover:bg-stork-dark transition-all",
                        activeLeague?.id === l.id && "text-stork-orange font-semibold"
                      )}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
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

        {/* Bottom */}
        <div className="px-3 pb-4 border-t border-stork-dark-border pt-4 space-y-0.5">
          <Link
            href="/dashboard/profile"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
              pathname === "/dashboard/profile"
                ? "bg-gradient-to-r from-stork-orange to-stork-gold-dark text-black shadow-glow-orange"
                : "text-muted-foreground hover:text-foreground hover:bg-stork-dark"
            )}
          >
            <User className="w-4 h-4" />
            Profilo
          </Link>
          {isAdmin && (
            <Link
              href="/admin/matchdays"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-stork-gold hover:bg-stork-dark transition-all group"
            >
              <Shield className="w-4 h-4 group-hover:text-stork-gold" />
              Gestisci Lega
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Esci
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {settings?.marquee_text && <MarqueeBanner text={settings.marquee_text} />}
        <main className="flex-1 pb-24 md:pb-0">{children}</main>
      </div>

      {/* Bottom nav Mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-stork-dark-card/95 backdrop-blur-md border-t border-stork-dark-border" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>
        <div className="flex overflow-x-auto scrollbar-none">
          {[...navItems, { href: "/dashboard/profile", label: "Profilo", icon: User }].map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center gap-1.5 pt-3 pb-1 px-4 text-[11px] font-medium transition-all min-w-[68px]",
                  active ? "text-stork-orange" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("w-6 h-6", active && "drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin/matchdays"
              className={cn(
                "flex-shrink-0 flex flex-col items-center gap-1.5 pt-3 pb-1 px-4 text-[11px] font-medium transition-all min-w-[68px]",
                pathname.startsWith("/admin") ? "text-stork-gold" : "text-muted-foreground"
              )}
            >
              <Shield className={cn("w-6 h-6", pathname.startsWith("/admin") && "drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]")} />
              <span className="truncate">Admin</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex-shrink-0 flex flex-col items-center gap-1.5 pt-3 pb-1 px-4 text-[11px] font-medium text-muted-foreground hover:text-red-400 transition-all min-w-[68px]"
          >
            <LogOut className="w-6 h-6" />
            <span className="truncate">Esci</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
