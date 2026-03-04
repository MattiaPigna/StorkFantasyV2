"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Users, Star, CreditCard, Trophy, Building, Settings, LogOut, ArrowLeft, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

const adminNavItems = [
  { href: "/admin/matchdays", label: "Giornate", icon: Calendar },
  { href: "/admin/players", label: "Giocatori", icon: Users },
  { href: "/admin/rules", label: "Regole", icon: Star },
  { href: "/admin/cards", label: "Card Speciali", icon: CreditCard },
  { href: "/admin/tournament", label: "Torneo", icon: Trophy },
  { href: "/admin/sponsors", label: "Sponsor", icon: Building },
  { href: "/admin/settings", label: "Impostazioni", icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast({ title: "Logout effettuato" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-stork-dark-border bg-card fixed h-full z-20">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-stork-dark-border">
          <div className="w-9 h-9 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Area Admin</p>
            <p className="text-xs text-muted-foreground">StorkLeague</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {adminNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                pathname === item.href
                  ? "bg-stork-orange text-white shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-3 pb-4 border-t border-stork-dark-border pt-4 space-y-1">
          <Link
            href="/dashboard/home"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla Lega
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Esci
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-card border-b border-stork-dark-border z-20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            <span className="font-bold text-sm">Admin Panel</span>
          </div>
          <Link href="/dashboard/home" className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Lega
          </Link>
        </div>
        {/* Mobile sub-nav */}
        <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
          {adminNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                pathname === item.href
                  ? "bg-stork-orange text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-28 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
