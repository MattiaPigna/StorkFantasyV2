"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  teamName: z.string().min(2).max(30),
  managerName: z.string().min(2).max(40),
});
type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

const PARTICLES = [
  { size: 3, x: 12, y: 18, delay: 0, dur: 14 },
  { size: 2, x: 28, y: 72, delay: 2, dur: 18 },
  { size: 4, x: 45, y: 35, delay: 5, dur: 12 },
  { size: 2, x: 63, y: 88, delay: 1, dur: 20 },
  { size: 3, x: 78, y: 22, delay: 7, dur: 15 },
  { size: 2, x: 90, y: 55, delay: 3, dur: 17 },
  { size: 4, x: 8,  y: 60, delay: 9, dur: 13 },
  { size: 2, x: 55, y: 10, delay: 4, dur: 22 },
  { size: 3, x: 35, y: 95, delay: 6, dur: 16 },
  { size: 2, x: 72, y: 44, delay: 8, dur: 19 },
  { size: 3, x: 20, y: 50, delay: 11, dur: 14 },
  { size: 2, x: 85, y: 78, delay: 13, dur: 21 },
];

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
      const { data: result, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { team_name: data.teamName, manager_name: data.managerName } },
      });
      if (error) throw error;
      if (result.user && result.user.identities?.length === 0) {
        toast({ variant: "destructive", title: "Utente già registrato", description: "Questa email è già associata a un account. Accedi invece di registrarti." });
        setMode("login");
        return;
      }
      toast({ title: "Benvenuto nella StorkLeague!" });
      router.push("/dashboard/home");
      router.refresh();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Errore", description: err instanceof Error ? err.message : "Errore registrazione" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap');

        @keyframes orb-drift-1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(60px,-40px) scale(1.15); }
          66%      { transform: translate(-30px, 50px) scale(0.9); }
        }
        @keyframes orb-drift-2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%     { transform: translate(-80px, 60px) scale(1.2); }
          70%     { transform: translate(50px,-30px) scale(0.85); }
        }
        @keyframes orb-drift-3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(40px, 80px) scale(1.1); }
        }
        @keyframes float-up {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.3; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }
        @keyframes ball-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ball-drift {
          0%,100% { transform: translate(0,0); }
          30%     { transform: translate(30px,-20px); }
          70%     { transform: translate(-20px,15px); }
        }
        @keyframes beam-sweep {
          0%,100% { transform: rotate(-25deg); opacity: 0.06; }
          50%     { transform: rotate(25deg); opacity: 0.12; }
        }
        @keyframes beam-sweep-2 {
          0%,100% { transform: rotate(20deg); opacity: 0.05; }
          50%     { transform: rotate(-20deg); opacity: 0.10; }
        }
        @keyframes pitch-stripe {
          0%,100% { opacity: 0.035; }
          50%     { opacity: 0.065; }
        }
        @keyframes form-in {
          from { opacity:0; transform: translateY(24px); }
          to   { opacity:1; transform: translateY(0); }
        }
        @keyframes title-in {
          from { opacity:0; transform: translateX(-32px); }
          to   { opacity:1; transform: translateX(0); }
        }
        @keyframes badge-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
          50%     { box-shadow: 0 0 0 8px rgba(249,115,22,0); }
        }
        @keyframes pitch-glow {
          0%,100% { opacity: 0.07; }
          50%     { opacity: 0.13; }
        }

        .sl-title    { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }
        .sl-body     { font-family: 'DM Sans', sans-serif; }
        .sl-form-in  { animation: form-in 0.7s cubic-bezier(.22,1,.36,1) 0.2s both; }
        .sl-title-in { animation: title-in 0.8s cubic-bezier(.22,1,.36,1) 0.1s both; }

        .orb-1 { animation: orb-drift-1 18s ease-in-out infinite; }
        .orb-2 { animation: orb-drift-2 22s ease-in-out infinite; }
        .orb-3 { animation: orb-drift-3 26s ease-in-out infinite; }

        .sl-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 14px;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .sl-input::placeholder { color: rgba(255,255,255,0.3); }
        .sl-input:focus {
          border-color: rgba(249,115,22,0.6);
          background: rgba(249,115,22,0.05);
        }
        .sl-tab-active {
          background: linear-gradient(135deg, #f97316, #d97706);
          color: #000;
          font-weight: 700;
          box-shadow: 0 4px 16px rgba(249,115,22,0.35);
        }
        .sl-tab-inactive {
          color: rgba(255,255,255,0.45);
          font-weight: 500;
        }
        .sl-tab-inactive:hover { color: rgba(255,255,255,0.8); }
        .sl-btn {
          width: 100%;
          padding: 13px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          border: none;
          background: linear-gradient(135deg, #f97316 0%, #d97706 100%);
          color: #000;
          letter-spacing: 0.02em;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(249,115,22,0.4);
        }
        .sl-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(249,115,22,0.5);
        }
        .sl-btn:active:not(:disabled) { transform: translateY(0); }
        .sl-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sl-card {
          background: rgba(10,10,12,0.75);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .sl-feature {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 16px;
          transition: border-color 0.25s, background 0.25s;
        }
        .sl-feature:hover {
          border-color: rgba(249,115,22,0.3);
          background: rgba(249,115,22,0.05);
        }
        .sl-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(249,115,22,0.12);
          border: 1px solid rgba(249,115,22,0.3);
          border-radius: 999px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #f97316;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          animation: badge-pulse 2.5s ease-in-out infinite;
        }
        .sl-live-dot {
          width: 6px; height: 6px;
          background: #f97316;
          border-radius: 50%;
          animation: badge-pulse 1.5s ease-in-out infinite;
        }
        .hexagon {
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }
      `}</style>

      <main className="sl-body min-h-screen overflow-hidden relative flex" style={{ background: '#080a0d' }}>

        {/* ── Dynamic Background ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">

          {/* Base grass gradient */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(160deg, #060d08 0%, #080a0d 45%, #06100a 100%)',
          }} />

          {/* Grass stripes */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="absolute inset-x-0" style={{
              top: `${i * 10}%`, height: '5%',
              background: 'rgba(255,255,255,0.018)',
              animation: `pitch-stripe ${5 + i * 0.4}s ease-in-out ${i * 0.3}s infinite`,
            }} />
          ))}

          {/* ── Pitch SVG lines ── */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ animation: 'pitch-glow 7s ease-in-out infinite' }}>
            {/* Outer border */}
            <rect x="5" y="5" width="90" height="90" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
            {/* Halfway line */}
            <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
            {/* Centre circle */}
            <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.3" />
            {/* Centre spot */}
            <circle cx="50" cy="50" r="0.8" fill="rgba(255,255,255,0.15)" />
            {/* Top penalty area */}
            <rect x="28" y="5" width="44" height="16" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.25" />
            {/* Top goal area */}
            <rect x="38" y="5" width="24" height="7" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.2" />
            {/* Top penalty spot */}
            <circle cx="50" cy="26" r="0.8" fill="rgba(255,255,255,0.1)" />
            {/* Bottom penalty area */}
            <rect x="28" y="79" width="44" height="16" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.25" />
            {/* Bottom goal area */}
            <rect x="38" y="88" width="24" height="7" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.2" />
            {/* Bottom penalty spot */}
            <circle cx="50" cy="74" r="0.8" fill="rgba(255,255,255,0.1)" />
            {/* Corner arcs */}
            <path d="M5,8 A3,3 0 0,0 8,5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.25" />
            <path d="M92,5 A3,3 0 0,0 95,8" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.25" />
            <path d="M5,92 A3,3 0 0,1 8,95" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.25" />
            <path d="M95,92 A3,3 0 0,0 92,95" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.25" />
          </svg>

          {/* Orb 1 — orange glow over pitch */}
          <div className="orb-1 absolute" style={{
            top: '5%', left: '0%',
            width: 600, height: 600,
            background: 'radial-gradient(circle, rgba(249,115,22,0.14) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(50px)',
          }} />

          {/* Orb 2 — gold */}
          <div className="orb-2 absolute" style={{
            bottom: '-5%', right: '5%',
            width: 650, height: 650,
            background: 'radial-gradient(circle, rgba(217,119,6,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(55px)',
          }} />

          {/* Orb 3 — emerald tint */}
          <div className="orb-3 absolute" style={{
            top: '35%', left: '35%',
            width: 500, height: 500,
            background: 'radial-gradient(circle, rgba(16,74,36,0.18) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)',
          }} />

          {/* Stadium beam 1 */}
          <div style={{
            position: 'absolute', top: '-20%', left: '15%',
            width: 4, height: '140%',
            background: 'linear-gradient(180deg, rgba(249,115,22,0.15) 0%, transparent 100%)',
            transformOrigin: 'top center', filter: 'blur(8px)',
            animation: 'beam-sweep 9s ease-in-out infinite',
          }} />
          {/* Stadium beam 2 */}
          <div style={{
            position: 'absolute', top: '-20%', right: '22%',
            width: 4, height: '130%',
            background: 'linear-gradient(180deg, rgba(217,119,6,0.12) 0%, transparent 100%)',
            transformOrigin: 'top center', filter: 'blur(10px)',
            animation: 'beam-sweep-2 13s ease-in-out infinite',
          }} />

          {/* Floating footballs */}
          {PARTICLES.map((p, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${p.x}%`,
              bottom: '-30px',
              width: p.size * 5,
              height: p.size * 5,
              animation: `float-up ${p.dur}s linear ${p.delay}s infinite`,
            }}>
              <svg viewBox="0 0 24 24" style={{
                width: '100%', height: '100%',
                animation: `ball-spin ${4 + i * 0.7}s linear infinite`,
                opacity: 0.5,
              }}>
                <circle cx="12" cy="12" r="11" fill="none" stroke={i % 2 === 0 ? 'rgba(249,115,22,0.7)' : 'rgba(217,119,6,0.6)'} strokeWidth="1.5" />
                <polygon points="12,4 14.5,8.5 12,11 9.5,8.5" fill="none" stroke={i % 2 === 0 ? 'rgba(249,115,22,0.6)' : 'rgba(217,119,6,0.5)'} strokeWidth="0.8" />
                <polygon points="12,20 14.5,15.5 12,13 9.5,15.5" fill="none" stroke={i % 2 === 0 ? 'rgba(249,115,22,0.6)' : 'rgba(217,119,6,0.5)'} strokeWidth="0.8" />
                <polygon points="4,12 8.5,9.5 11,12 8.5,14.5" fill="none" stroke={i % 2 === 0 ? 'rgba(249,115,22,0.6)' : 'rgba(217,119,6,0.5)'} strokeWidth="0.8" />
                <polygon points="20,12 15.5,9.5 13,12 15.5,14.5" fill="none" stroke={i % 2 === 0 ? 'rgba(249,115,22,0.6)' : 'rgba(217,119,6,0.5)'} strokeWidth="0.8" />
              </svg>
            </div>
          ))}

          {/* Bottom vignette */}
          <div className="absolute bottom-0 left-0 right-0 h-48" style={{
            background: 'linear-gradient(0deg, rgba(6,10,8,0.9) 0%, transparent 100%)',
          }} />
        </div>

        {/* ── Left — Branding ── */}
        <div className="flex-1 flex flex-col justify-center px-8 py-12 md:px-12 lg:px-20 relative z-10 hidden md:flex">
          <div className="max-w-xl sl-title-in">

            {/* Live badge */}
            <div className="sl-live-badge mb-10" style={{ width: 'fit-content' }}>
              <span className="sl-live-dot" />
              Stagione in corso
            </div>

            {/* Logo */}
            <div className="flex items-center gap-4 mb-8">
              <div style={{
                width: 64, height: 64,
                borderRadius: 16,
                background: 'rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 40px rgba(249,115,22,0.4)',
                border: '1px solid rgba(249,115,22,0.2)',
                overflow: 'hidden',
              }}>
                <img src="/storkleague.svg" alt="StorkLeague" style={{ width: 52, height: 52, objectFit: 'contain' }} />
              </div>
              <div>
                <h1 className="sl-title text-3xl" style={{ color: '#fff', lineHeight: 1 }}>StorkLeague</h1>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>
                  Fantacalcio Ufficiale
                </p>
              </div>
            </div>

            {/* Hero text */}
            <h2 className="sl-title" style={{
              fontSize: 'clamp(52px, 7vw, 88px)',
              lineHeight: 0.95,
              color: '#fff',
              marginBottom: 20,
            }}>
              La tua lega<br />
              <span style={{
                backgroundImage: 'linear-gradient(135deg, #f97316 0%, #f59e0b 50%, #f97316 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                di fantacalcio
              </span>
            </h2>

            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginBottom: 40, maxWidth: 420 }}>
              Gestisci la tua squadra, compra i migliori giocatori e scala la classifica.
            </p>

            {/* Feature pills */}
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { icon: <Zap size={15} />, label: "Mercato", desc: "Live trading" },
                { icon: <Shield size={15} />, label: "Classifica", desc: "Real-time" },
              ].map((f) => (
                <div key={f.label} className="sl-feature" style={{ flex: 1 }}>
                  <div style={{
                    width: 32, height: 32,
                    borderRadius: 8,
                    background: 'rgba(249,115,22,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#f97316',
                    marginBottom: 10,
                  }}>
                    {f.icon}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{f.label}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right — Auth Form ── */}
        <div className="w-full md:w-[440px] lg:w-[500px] flex items-center justify-center px-5 py-10 relative z-10">
          <div className="sl-card sl-form-in w-full max-w-sm p-8">

            {/* Mobile logo */}
            <div className="flex items-center gap-3 mb-8 md:hidden">
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: 'rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 24px rgba(249,115,22,0.4)',
                border: '1px solid rgba(249,115,22,0.2)',
                overflow: 'hidden',
              }}>
                <img src="/storkleague.svg" alt="StorkLeague" style={{ width: 36, height: 36, objectFit: 'contain' }} />
              </div>
              <span className="sl-title text-2xl" style={{ color: '#fff' }}>StorkLeague</span>
            </div>

            {/* Tab switcher */}
            <div style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: 4,
              marginBottom: 28,
              gap: 4,
            }}>
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1,
                    padding: '9px 0',
                    borderRadius: 8,
                    fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.25s',
                  }}
                  className={mode === m ? "sl-tab-active" : "sl-tab-inactive"}
                >
                  {m === "login" ? "Accedi" : "Registrati"}
                </button>
              ))}
            </div>

            {/* Heading */}
            <div style={{ marginBottom: 24 }}>
              <h3 className="sl-title" style={{ fontSize: 30, color: '#fff', lineHeight: 1, marginBottom: 6 }}>
                {mode === "login" ? "Bentornato" : "Crea account"}
              </h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                {mode === "login" ? "Inserisci le credenziali per accedere" : "Unisciti alla StorkLeague oggi"}
              </p>
            </div>

            {/* Forms */}
            {mode === "login" ? (
              <form onSubmit={loginForm.handleSubmit(handleLogin)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>EMAIL</label>
                  <input className="sl-input" type="email" placeholder="la.tua@email.com" {...loginForm.register("email")} />
                  {loginForm.formState.errors.email && <p style={{ fontSize: 11, color: '#f87171' }}>{loginForm.formState.errors.email.message}</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>PASSWORD</label>
                  <input className="sl-input" type="password" placeholder="••••••••" {...loginForm.register("password")} />
                  {loginForm.formState.errors.password && <p style={{ fontSize: 11, color: '#f87171' }}>{loginForm.formState.errors.password.message}</p>}
                </div>
                <div style={{ marginTop: 6 }}>
                  <button type="submit" className="sl-btn" disabled={isLoading}>
                    {isLoading ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Loader2 size={16} className="animate-spin" />Accesso...</span> : "Accedi alla Lega"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={signupForm.handleSubmit(handleSignup)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>ALLENATORE</label>
                    <input className="sl-input" placeholder="Mario Rossi" {...signupForm.register("managerName")} />
                    {signupForm.formState.errors.managerName && <p style={{ fontSize: 11, color: '#f87171' }}>{signupForm.formState.errors.managerName.message}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>SQUADRA</label>
                    <input className="sl-input" placeholder="FC Campioni" {...signupForm.register("teamName")} />
                    {signupForm.formState.errors.teamName && <p style={{ fontSize: 11, color: '#f87171' }}>{signupForm.formState.errors.teamName.message}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>EMAIL</label>
                  <input className="sl-input" type="email" placeholder="la.tua@email.com" {...signupForm.register("email")} />
                  {signupForm.formState.errors.email && <p style={{ fontSize: 11, color: '#f87171' }}>{signupForm.formState.errors.email.message}</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>PASSWORD</label>
                  <input className="sl-input" type="password" placeholder="Min. 8 caratteri" {...signupForm.register("password")} />
                  {signupForm.formState.errors.password && <p style={{ fontSize: 11, color: '#f87171' }}>{signupForm.formState.errors.password.message}</p>}
                </div>
                <div style={{ marginTop: 6 }}>
                  <button type="submit" className="sl-btn" disabled={isLoading}>
                    {isLoading ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Loader2 size={16} className="animate-spin" />Registrazione...</span> : "Entra nella Lega"}
                  </button>
                </div>
              </form>
            )}

            {/* Footer */}
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 24 }}>
              © 2025 StorkLeague · Fantacalcio Ufficiale
            </p>
          </div>
        </div>

      </main>
    </>
  );
}
