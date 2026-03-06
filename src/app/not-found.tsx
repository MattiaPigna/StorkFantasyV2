import Link from "next/link";
import { Trophy, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-stork-orange/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-stork-orange to-stork-gold-dark flex items-center justify-center shadow-glow-orange mb-6">
        <Trophy className="w-8 h-8 text-black" />
      </div>

      <h1 className="text-8xl font-black text-gradient mb-2">404</h1>
      <p className="text-xl font-bold text-foreground mb-2">Pagina non trovata</p>
      <p className="text-muted-foreground mb-8 max-w-sm">
        La pagina che cerchi non esiste o è stata spostata.
      </p>

      <Link
        href="/dashboard/home"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-stork-orange to-stork-gold-dark text-black font-bold hover:opacity-90 transition-opacity shadow-glow-orange"
      >
        <Home className="w-4 h-4" />
        Torna alla Home
      </Link>
    </main>
  );
}
