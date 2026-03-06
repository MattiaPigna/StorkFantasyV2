"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Trophy, Users, Zap, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { getSponsors } from "@/lib/db/settings";
import type { Sponsor } from "@/types";
import { SPONSOR_TYPE_LABELS } from "@/lib/constants";

const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(6, "Minimo 6 caratteri"),
});
const signupSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "Minimo 8 caratteri"),
  teamName: z.string().min(2).max(30),
  managerName: z.string().min(2).max(40),
});
type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

export function LandingPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    getSponsors().then(setSponsors).catch((err) => console.error("Sponsors fetch error:", err));
  }, []);

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  async function handleLogin(data: LoginForm) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (error) throw error;
      router.push("/dashboard/home");
      router.refresh();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Credenziali non valide" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignup(data: SignupForm) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { team_name: data.teamName, manager_name: data.managerName } },
      });
      if (error) throw error;
      toast({ title: "Benvenuto nella StorkLeague!" });
      router.push("/dashboard/home");
      router.refresh();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore registrazione" });
    } finally {
      setIsLoading(false);
    }
  }

  const mainSponsors = sponsors.filter((s) => s.type === "main");
  const otherSponsors = sponsors.filter((s) => s.type !== "main");

  return (
    <main className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Sponsor marquee */}
      {sponsors.length > 0 && (
        <div className="bg-stork-dark border-b border-stork-dark-border overflow-hidden py-2">
          <div className="flex whitespace-nowrap w-max animate-marquee-sponsors">
            {[...sponsors, ...sponsors].map((s, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-6 text-sm text-muted-foreground">
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.name} className="h-5 w-auto object-contain opacity-80" />
                ) : (
                  <span className="text-stork-orange font-semibold">{s.name}</span>
                )}
                <span className="text-stork-dark-border">·</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ambient glow top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-stork-orange/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-stork-gold/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex-1 flex flex-col md:flex-row relative z-10">
        {/* Left - Branding */}
        <div className="flex-1 flex flex-col justify-center px-6 py-10 md:px-10 lg:px-16">
          <div className="max-w-lg mx-auto lg:mx-0 animate-slide-up">
            {/* Logo */}
            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-stork-orange to-stork-gold-dark flex items-center justify-center shadow-glow-orange">
                <Trophy className="w-7 h-7 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gradient">StorkLeague</h1>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Fantacalcio Ufficiale</p>
              </div>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-6xl font-black text-foreground leading-tight mb-4">
              La tua lega di<br />
              <span className="text-gradient">fantacalcio</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
              Gestisci la tua squadra, compra i migliori giocatori e scala la classifica.
            </p>

            {/* Feature cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Users, label: "Rosa", desc: "Fino a 15 giocatori" },
                { icon: Zap, label: "Mercato", desc: "Live trading" },
                { icon: Shield, label: "Classifica", desc: "Real-time" },
              ].map((f) => (
                <div key={f.label} className="glass rounded-xl p-4 hover:border-stork-orange/30 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-stork-orange/15 flex items-center justify-center mb-3">
                    <f.icon className="w-4 h-4 text-stork-orange" />
                  </div>
                  <p className="text-sm font-bold text-foreground">{f.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right - Auth Form */}
        <div className="flex items-center justify-center px-6 py-8 md:py-12 md:px-8 lg:px-16 md:w-[420px] lg:w-[500px]">
          <Card className="w-full max-w-md border-stork-dark-border animate-fade-in shadow-card">
            <CardHeader className="pb-4">
              {/* Tab switcher */}
              <div className="flex rounded-xl bg-stork-dark p-1 mb-3 border border-stork-dark-border">
                {(["login", "signup"] as const).map((m) => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                      mode === m
                        ? "bg-gradient-to-r from-stork-orange to-stork-gold-dark text-black shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {m === "login" ? "Accedi" : "Registrati"}
                  </button>
                ))}
              </div>
              <CardTitle className="text-xl font-black">
                {mode === "login" ? "Bentornato! 👋" : "Crea il tuo account"}
              </CardTitle>
              <CardDescription>
                {mode === "login" ? "Inserisci le credenziali per accedere" : "Unisciti alla StorkLeague oggi"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {mode === "login" ? (
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input type="email" placeholder="la.tua@email.com" {...loginForm.register("email")} />
                    {loginForm.formState.errors.email && <p className="text-xs text-red-400">{loginForm.formState.errors.email.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <Input type="password" placeholder="••••••••" {...loginForm.register("password")} />
                    {loginForm.formState.errors.password && <p className="text-xs text-red-400">{loginForm.formState.errors.password.message}</p>}
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
                    {isLoading && <Loader2 className="animate-spin" />}
                    {isLoading ? "Accesso..." : "Accedi alla Lega"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Nome Allenatore</label>
                      <Input placeholder="Mario Rossi" {...signupForm.register("managerName")} />
                      {signupForm.formState.errors.managerName && <p className="text-xs text-red-400">{signupForm.formState.errors.managerName.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Nome Squadra</label>
                      <Input placeholder="FC Campioni" {...signupForm.register("teamName")} />
                      {signupForm.formState.errors.teamName && <p className="text-xs text-red-400">{signupForm.formState.errors.teamName.message}</p>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input type="email" placeholder="la.tua@email.com" {...signupForm.register("email")} />
                    {signupForm.formState.errors.email && <p className="text-xs text-red-400">{signupForm.formState.errors.email.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <Input type="password" placeholder="Min. 8 caratteri" {...signupForm.register("password")} />
                    {signupForm.formState.errors.password && <p className="text-xs text-red-400">{signupForm.formState.errors.password.message}</p>}
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
                    {isLoading && <Loader2 className="animate-spin" />}
                    {isLoading ? "Registrazione..." : "Entra nella Lega"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sponsors section */}
      {sponsors.length > 0 && (
        <div className="relative z-10 border-t border-stork-dark-border bg-stork-dark/50 px-8 py-10">
          <p className="text-xs uppercase tracking-widest text-muted-foreground text-center mb-6">I nostri sponsor</p>

          {mainSponsors.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              {mainSponsors.map((s) => (
                <a
                  key={s.id}
                  href={s.website_url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass rounded-xl px-6 py-4 flex items-center gap-3 hover:border-stork-orange/40 transition-all group"
                >
                  {s.logo_url ? (
                    <img src={s.logo_url} alt={s.name} className="h-8 w-auto object-contain" />
                  ) : (
                    <span className="text-base font-black text-gradient">{s.name}</span>
                  )}
                  <span className="text-xs bg-stork-orange/15 text-stork-orange px-2 py-0.5 rounded-full font-semibold">
                    {SPONSOR_TYPE_LABELS[s.type]}
                  </span>
                  {s.website_url && <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                </a>
              ))}
            </div>
          )}

          {otherSponsors.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3">
              {otherSponsors.map((s) => (
                <a
                  key={s.id}
                  href={s.website_url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass rounded-lg px-4 py-2.5 flex items-center gap-2 hover:border-stork-orange/30 transition-all group"
                >
                  {s.logo_url ? (
                    <img src={s.logo_url} alt={s.name} className="h-5 w-auto object-contain opacity-80" />
                  ) : (
                    <span className="text-sm font-semibold text-foreground">{s.name}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{SPONSOR_TYPE_LABELS[s.type]}</span>
                  {s.website_url && <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
