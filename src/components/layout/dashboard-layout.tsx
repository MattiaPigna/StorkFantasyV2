"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, Trophy, BookOpen, CreditCard, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MarqueeBanner } from "@/components/features/marquee-banner";
import { useEffect, useState } from "react";
import { getAppSettings } from "@/lib/db/settings";
import type { AppSettings } from "@/types";

const navItems = [
  { href: "/dashboard/home", label: "Home", icon: Home },
  { href: "/dashboard/lineup", label: "Il Mio Campo", icon: LayoutGrid },
  { href: "/dashboard/market", label: "Mercato", icon: ShoppingCart },
  { href: "/dashboard/standings", label: "Classifica", icon: Trophy },
  { href: "/dashboard/rules", label: "Regole", icon: BookOpen },
  { href: "/dashboard/cards", label: "Card", icon: CreditCard },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    getAppSettings().then(setSettings).catch(() => null);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast({ title: "Arrivederci!" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-stork-dark-border bg-stork-dark-card fixed h-full z-20">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-stork-dark-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stork-orange to-stork-gold-dark flex items-center justify-center shadow-glow-orange">
            <Trophy className="w-5 h-5 text-black" />
          </div>
          <div>
            <p className="font-black text-sm text-gradient">StorkLeague</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Fantacalcio</p>
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
            href="/admin/matchdays"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-stork-gold hover:bg-stork-dark transition-all group"
          >
            <Shield className="w-4 h-4 group-hover:text-stork-gold" />
            Area Admin
          </Link>
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
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {settings?.marquee_text && <MarqueeBanner text={settings.marquee_text} />}
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      </div>

      {/* Bottom nav Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-stork-dark-card/95 backdrop-blur-md border-t border-stork-dark-border">
        <div className="flex">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-all",
                  active ? "text-stork-orange" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", active && "drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
