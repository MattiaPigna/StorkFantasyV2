"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

export default function EmailConfirmedPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          router.push("/dashboard/home");
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <main style={{
      minHeight: "100vh",
      background: "#080a0d",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "'DM Sans', sans-serif",
      overflow: "hidden",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');

        @keyframes orb-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50%       { transform: scale(1.15); opacity: 0.9; }
        }
        @keyframes check-pop {
          0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(3deg); opacity: 1; }
          80%  { transform: scale(0.95) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ring-grow {
          0%   { transform: scale(0.6); opacity: 0; }
          50%  { opacity: 0.5; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
        .check-icon    { animation: check-pop 0.6s cubic-bezier(.22,1,.36,1) 0.3s both; }
        .card-in       { animation: card-in 0.7s cubic-bezier(.22,1,.36,1) 0.1s both; }
        .ring          { animation: ring-grow 2s ease-out 0.5s infinite; }
        .progress-bar  { animation: progress ${4}s linear 0.5s both; }
      `}</style>

      {/* Background orb */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 600,
        background: "radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 65%)",
        borderRadius: "50%",
        filter: "blur(40px)",
        animation: "orb-pulse 4s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      <div className="card-in" style={{
        background: "rgba(10,10,12,0.85)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24,
        boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(34,197,94,0.08)",
        padding: "48px 40px 40px",
        width: "100%",
        maxWidth: 420,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Top accent line */}
        <div style={{
          position: "absolute", top: 0, left: "10%", right: "10%", height: 2,
          background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.6), transparent)",
          borderRadius: 2,
        }} />

        {/* Icon with rings */}
        <div style={{ position: "relative", display: "inline-flex", marginBottom: 28 }}>
          {/* Pulse rings */}
          <div className="ring" style={{
            position: "absolute", inset: -8,
            border: "1.5px solid rgba(34,197,94,0.4)",
            borderRadius: "50%",
          }} />
          <div className="ring" style={{
            position: "absolute", inset: -8,
            border: "1.5px solid rgba(34,197,94,0.3)",
            borderRadius: "50%",
            animationDelay: "0.8s",
          }} />
          {/* Icon container */}
          <div style={{
            width: 80, height: 80,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, rgba(34,197,94,0.25), rgba(34,197,94,0.08))",
            border: "1.5px solid rgba(34,197,94,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 32px rgba(34,197,94,0.2)",
          }}>
            <CheckCircle className="check-icon" size={38} style={{ color: "#22c55e" }} />
          </div>
        </div>

        {/* Text */}
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 40,
          color: "#fff",
          letterSpacing: "0.04em",
          lineHeight: 1,
          marginBottom: 10,
        }}>
          Email Confermata!
        </h1>

        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, marginBottom: 8 }}>
          Il tuo account è attivo e pronto all'uso.
        </p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 36 }}>
          Verrai reindirizzato alla dashboard tra{" "}
          <span style={{ color: "#22c55e", fontWeight: 700 }}>{countdown}</span> secondi…
        </p>

        {/* Progress bar */}
        <div style={{
          background: "rgba(255,255,255,0.06)",
          borderRadius: 999,
          height: 3,
          overflow: "hidden",
          marginBottom: 28,
        }}>
          <div className="progress-bar" style={{
            height: "100%",
            background: "linear-gradient(90deg, #22c55e, #86efac)",
            borderRadius: 999,
          }} />
        </div>

        {/* Manual button */}
        <button
          onClick={() => router.push("/dashboard/home")}
          style={{
            width: "100%",
            padding: "13px",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            border: "none",
            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
            color: "#fff",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
            letterSpacing: "0.02em",
          }}
        >
          Vai alla Dashboard →
        </button>
      </div>
    </main>
  );
}
