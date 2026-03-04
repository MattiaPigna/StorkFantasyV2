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
      <aside className="hidden lg:flex flex-col w-64 border-r border-stork-dark-border bg-stork-dark-card fixed h-full z-20">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-stork-dark-border">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="font-black text-sm text-foreground">Area Admin</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">StorkLeague</p>
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
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-stork-dark-card/95 backdrop-blur-md border-b border-stork-dark-border z-20 px-4 py-3">
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

      <main className="flex-1 lg:ml-64 pt-28 lg:pt-0">{children}</main>


      

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    getAppSettings().then(setSettings).catch(() => null);
  }, []);


      

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-stork-dark-border bg-stork-dark-card fixed h-full z-20">
        {/* LOGO */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-stork-dark-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stork-orange to-stork-gold-dark flex items-center justify-center shadow-glow-orange">
            <Trophy className="w-5 h-5 text-black" />
          </div>
          <div>
            <p className="font-black text-sm text-gradient">StorkLeague</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Fantacalcio</p>
          </div>
        </div>

        {/* NAV LINKS */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
             // ... (mappatura esistente)
          })}
        </nav>

        {/* --- RIQUADRO SPONSOR DINAMICO --- */}
        {settings?.sponsor_name && (
          <div className="px-3 mb-4">
            <div className="rounded-xl border border-stork-dark-border bg-stork-dark/30 p-3 flex flex-col items-center text-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter mb-2 italic">
                Sostenuto da
              </span>
              
              {/* Contenitore Immagine */}
              <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-black/40 border border-white/5 mb-2 group">
                {settings.sponsor_image_url ? (
                  <img 
                    src={settings.sponsor_image_url} 
                    alt={settings.sponsor_name}
                    className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-stork-dark-border/20">
                    <Building className="w-6 h-6 text-muted-foreground opacity-20" />
                  </div>
                )}
              </div>

              {/* Nome e Link */}
              <p className="text-[11px] font-semibold text-stork-gold uppercase tracking-wide">
                {settings.sponsor_name}
              </p>
              {settings.sponsor_link && (
                <a 
                  href={settings.sponsor_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-1 text-[10px] text-muted-foreground hover:text-stork-orange underline transition-colors"
                >
                  Visita il partner
                </a>
              )}
            </div>
          </div>
        )}
        {/* ------------------------------- */}

        {/* Bottom (Admin & Logout) */}
        <div className="px-3 pb-4 border-t border-stork-dark-border pt-4">
          {/* ... (codice esistente) */}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {settings?.marquee_text && <MarqueeBanner text={settings.marquee_text} />}
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      </div>

      {/* Bottom nav Mobile (Aggiunta Sponsor nel footer mobile?) */}
      {/* CONSIGLIO: Su mobile, invece di un riquadro fisso, 
          potresti aggiungere il nome dello sponsor nel MarqueeBanner 
          o come piccola scritta sotto l'ultima voce della nav mobile.
      */}
    </div>
  );
}
    </div>
  );
}
