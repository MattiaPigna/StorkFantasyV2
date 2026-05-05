"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, Trophy, BookOpen, LogOut, Shield, User, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MarqueeBanner } from "@/components/features/marquee-banner";
import { useEffect, useRef, useState } from "react";
import { getAppSettings } from "@/lib/db/settings";
import { getMyLeagues } from "@/lib/db/leagues";
import { useLeagueStore } from "@/store/league";
import type { AppSettings } from "@/types";

/** Forces a full remount of children when leagueId changes, clearing stale state. */
function LeaguePage({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "249, 115, 22";
  return `${r}, ${g}, ${b}`;
}

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
  const { activeLeague, myLeagues, setActiveLeague, setMyLeagues, setAppSettings } = useLeagueStore();
  const [showLeaguePicker, setShowLeaguePicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const mobilePickerRef = useRef<HTMLDivElement>(null);

  // Apply league theme (CSS variables) whenever the active league changes
  useEffect(() => {
    const color = activeLeague?.primary_color ?? "#F97316";
    document.documentElement.style.setProperty("--league-primary", color);
    document.documentElement.style.setProperty("--league-primary-rgb", hexToRgb(color));
  }, [activeLeague?.primary_color]);

  useEffect(() => {
    if (!showLeaguePicker) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const inDesktop = pickerRef.current?.contains(target);
      const inMobile = mobilePickerRef.current?.contains(target);
      if (!inDesktop && !inMobile) setShowLeaguePicker(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLeaguePicker]);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load leagues if not in store
      if (myLeagues.length === 0) {
        try {
          const leagues = await getMyLeagues(user.id);
          if (leagues.length > 0) {
            setMyLeagues(leagues);
            if (!activeLeague) setActiveLeague(leagues[0]);
          } else {
            // Only redirect if the fetch succeeded and genuinely returned empty
            router.push("/league/setup");
            return;
          }
        } catch {
          // Network error — don't redirect, user might just be offline
          return;
        }
      } else if (!activeLeague && myLeagues.length > 0) {
        setActiveLeague(myLeagues[0]);
      }

      // Check admin status
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      setIsAdmin(profile?.is_admin ?? false);

      // Load settings for active league and share via store
      if (activeLeague) {
        getAppSettings(activeLeague.id).then((s) => {
          setSettings(s);
          setAppSettings(s);
        }).catch(() => null);
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
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
              style={{ background: `var(--league-primary)`, boxShadow: `0 0 20px rgba(var(--league-primary-rgb), 0.35)` }}
            >
              {activeLeague?.logo_url
                ? <img src={activeLeague.logo_url} alt={activeLeague.name} className="w-full h-full object-cover" />
                : <Trophy className="w-5 h-5 text-black" />
              }
            </div>
            <div className="min-w-0">
              <p className="font-black text-sm truncate" style={{ color: `var(--league-primary)` }}>{activeLeague?.name ?? "StorkLeague"}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Fantacalcio</p>
            </div>
          </div>

          {/* League switcher */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowLeaguePicker(!showLeaguePicker)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-stork-dark border border-stork-dark-border text-xs text-muted-foreground hover:text-foreground transition-all"
            >
              <span className="truncate">{activeLeague?.name ?? "Seleziona lega"}</span>
              <ChevronDown className="w-3 h-3 shrink-0" />
            </button>
            {showLeaguePicker && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-stork-dark-card border border-stork-dark-border rounded-xl shadow-card z-50 overflow-hidden">
                {myLeagues.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { setActiveLeague(l); setShowLeaguePicker(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs hover:bg-stork-dark transition-all border-b border-stork-dark-border last:border-0",
                      activeLeague?.id === l.id && "text-stork-orange font-semibold"
                    )}
                  >
                    {l.name}
                  </button>
                ))}
                <button
                  onClick={() => { setShowLeaguePicker(false); router.push("/league/select"); }}
                  className="w-full text-left px-3 py-2 text-xs text-stork-orange hover:bg-stork-dark transition-all flex items-center gap-1.5 border-t border-stork-dark-border"
                >
                  <Layers className="w-3 h-3" /> Cambia / Nuova lega
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={active ? { background: `var(--league-primary)`, boxShadow: `0 0 16px rgba(var(--league-primary-rgb), 0.3)` } : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  active
                    ? "text-black"
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
            style={pathname === "/dashboard/profile" ? { background: `var(--league-primary)`, boxShadow: `0 0 16px rgba(var(--league-primary-rgb), 0.3)` } : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
              pathname === "/dashboard/profile"
                ? "text-black"
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

        {/* Mobile league switcher — always visible */}
        <div className="md:hidden sticky top-0 z-10 bg-stork-dark-card/95 backdrop-blur-md border-b border-stork-dark-border px-4 py-2" ref={mobilePickerRef}>
          <button
            onClick={() => setShowLeaguePicker(!showLeaguePicker)}
            className="flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <Trophy className="w-3.5 h-3.5 text-stork-orange shrink-0" />
            <span className="truncate max-w-[200px]">{activeLeague?.name ?? "Seleziona lega"}</span>
            {showLeaguePicker
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            }
          </button>
          {showLeaguePicker && (
            <div className="absolute top-full left-0 right-0 bg-stork-dark-card border-b border-stork-dark-border shadow-card z-50">
              {myLeagues.map((l) => (
                <button
                  key={l.id}
                  onClick={() => { setActiveLeague(l); setShowLeaguePicker(false); }}
                  className={cn(
                    "w-full text-left px-4 py-3 text-sm hover:bg-stork-dark transition-all border-b border-stork-dark-border",
                    activeLeague?.id === l.id && "text-stork-orange font-semibold"
                  )}
                >
                  {l.name}
                </button>
              ))}
              <button
                onClick={() => { setShowLeaguePicker(false); router.push("/league/select"); }}
                className="w-full text-left px-4 py-3 text-sm text-stork-orange hover:bg-stork-dark transition-all flex items-center gap-2"
              >
                <Layers className="w-4 h-4" /> Cambia / Nuova lega
              </button>
            </div>
          )}
        </div>

        <main className="flex-1 pb-24 md:pb-0">
          <LeaguePage key={activeLeague?.id ?? "no-league"}>
            {children}
          </LeaguePage>
        </main>
      </div>

      {/* Bottom nav Mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-stork-dark-card/95 backdrop-blur-md border-t border-stork-dark-border" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}>
        <div className="flex justify-around">
          {[...navItems, { href: "/dashboard/profile", label: "Profilo", icon: User }].map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={active ? { color: `var(--league-primary)` } : undefined}
                className={cn(
                  "flex-1 min-w-0 flex flex-col items-center gap-1 pt-2 pb-1 text-[10px] font-medium transition-all",
                  !active && "text-muted-foreground"
                )}
              >
                <item.icon className="w-5 h-5" style={active ? { filter: `drop-shadow(0 0 6px rgba(var(--league-primary-rgb), 0.8))` } : undefined} />
                <span className="truncate w-full text-center px-0.5">{item.label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin/matchdays"
              className={cn(
                "flex-1 min-w-0 flex flex-col items-center gap-1 pt-2 pb-1 text-[10px] font-medium transition-all",
                pathname.startsWith("/admin") ? "text-stork-gold" : "text-muted-foreground"
              )}
            >
              <Shield className={cn("w-5 h-5", pathname.startsWith("/admin") && "drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]")} />
              <span className="truncate">Admin</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
