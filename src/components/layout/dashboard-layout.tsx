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
    toast({ title: "Arrivederci!", description: "Hai effettuato il logout." });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-stork-dark-border bg-card fixed h-full z-20">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-stork-dark-border">
          <div className="w-9 h-9 rounded-lg gradient-stork flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">StorkLeague</p>
            <p className="text-xs text-muted-foreground">Fantacalcio</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                pathname === item.href
                  ? "gradient-stork text-white shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-4 space-y-1 border-t border-stork-dark-border pt-4">
          <Link
            href="/admin/matchdays"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <Shield className="w-4 h-4" />
            Area Admin
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

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Marquee banner */}
        {settings?.marquee_text && (
          <MarqueeBanner text={settings.marquee_text} />
        )}

        {/* Page content */}
        <main className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom nav - Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-stork-dark-border z-20">
        <div className="flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-all",
                pathname === item.href
                  ? "text-stork-orange"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", pathname === item.href && "drop-shadow-[0_0_6px_rgba(249,115,22,0.8)]")} />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
