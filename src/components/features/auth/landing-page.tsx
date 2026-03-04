"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Trophy, Users, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(6, "Minimo 6 caratteri"),
});

const signupSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "Minimo 8 caratteri"),
  teamName: z.string().min(2, "Minimo 2 caratteri").max(30, "Massimo 30 caratteri"),
  managerName: z.string().min(2, "Minimo 2 caratteri").max(40, "Massimo 40 caratteri"),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

export function LandingPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  async function handleLogin(data: LoginForm) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      router.push("/dashboard/home");
      router.refresh();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Errore di accesso",
        description: err instanceof Error ? err.message : "Credenziali non valide",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignup(data: SignupForm) {
    setIsLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            team_name: data.teamName,
            manager_name: data.managerName,
          },
        },
      });
      if (error) throw error;

      if (authData.user) {
        toast({
          title: "Registrazione completata!",
          description: "Benvenuto nella StorkLeague!",
        });
        router.push("/dashboard/home");
        router.refresh();
      }
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Errore di registrazione",
        description: err instanceof Error ? err.message : "Errore durante la registrazione",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left - Branding */}
        <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16">
          <div className="max-w-lg mx-auto lg:mx-0 animate-slide-up">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl gradient-stork flex items-center justify-center">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">StorkLeague</h1>
                <p className="text-xs text-muted-foreground">Fantacalcio Ufficiale</p>
              </div>
            </div>

            <h2 className="text-4xl lg:text-5xl font-extrabold text-foreground leading-tight mb-4">
              La tua lega di<br />
              <span className="text-gradient">fantacalcio</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10">
              Gestisci la tua squadra, compra i migliori giocatori e scala la classifica.
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Users, label: "Rosa Completa", desc: "Gestisci fino a 15 giocatori" },
                { icon: Zap, label: "Calciomercato", desc: "Compra e vendi in tempo reale" },
                { icon: Shield, label: "Classifiche Live", desc: "Aggiornate ogni giornata" },
              ].map((f) => (
                <div key={f.label} className="glass rounded-xl p-4 border border-stork-dark-border">
                  <f.icon className="w-6 h-6 text-stork-orange mb-2" />
                  <p className="text-sm font-semibold text-foreground">{f.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right - Auth Form */}
        <div className="flex items-center justify-center px-6 py-12 lg:px-16 lg:w-[480px]">
          <Card className="w-full max-w-md animate-fade-in">
            <CardHeader className="pb-4">
              <div className="flex rounded-lg bg-muted p-1 mb-2">
                <button
                  onClick={() => setMode("login")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    mode === "login"
                      ? "bg-card text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Accedi
                </button>
                <button
                  onClick={() => setMode("signup")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    mode === "signup"
                      ? "bg-card text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Registrati
                </button>
              </div>
              <CardTitle className="text-xl">
                {mode === "login" ? "Bentornato!" : "Crea il tuo account"}
              </CardTitle>
              <CardDescription>
                {mode === "login"
                  ? "Inserisci le tue credenziali per accedere"
                  : "Unisciti alla StorkLeague oggi"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {mode === "login" ? (
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input
                      type="email"
                      placeholder="la.tua@email.com"
                      {...loginForm.register("email")}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...loginForm.register("password")}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : null}
                    {isLoading ? "Accesso in corso..." : "Accedi"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Nome Allenatore</label>
                      <Input placeholder="Mario Rossi" {...signupForm.register("managerName")} />
                      {signupForm.formState.errors.managerName && (
                        <p className="text-xs text-destructive">{signupForm.formState.errors.managerName.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Nome Squadra</label>
                      <Input placeholder="FC Campioni" {...signupForm.register("teamName")} />
                      {signupForm.formState.errors.teamName && (
                        <p className="text-xs text-destructive">{signupForm.formState.errors.teamName.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input type="email" placeholder="la.tua@email.com" {...signupForm.register("email")} />
                    {signupForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <Input type="password" placeholder="Min. 8 caratteri" {...signupForm.register("password")} />
                    {signupForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : null}
                    {isLoading ? "Registrazione..." : "Crea Account"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
