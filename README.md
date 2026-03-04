# StorkFantasy V2

App di fantacalcio per la StorkLeague — riscritta da zero con Next.js 15, Supabase e Tailwind CSS.

## Stack Tecnologico

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **UI**: Componenti custom (shadcn/ui style)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State**: Zustand + TanStack Query
- **Deploy**: Vercel
- **Mobile futuro**: Capacitor (iOS/Android)

## Setup

1. Clona il repo
2. Copia `.env.local.example` in `.env.local` e inserisci le credenziali Supabase
3. Esegui lo schema SQL in `supabase/schema.sql` nel tuo progetto Supabase
4. Installa le dipendenze: `npm install`
5. Avvia il dev server: `npm run dev`

## Variabili d'ambiente

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Impostare un Admin

Nel pannello Supabase, imposta `is_admin = true` nel record `profiles` per l'utente che deve avere accesso admin.

## Struttura

```
src/
├── app/                   # Next.js App Router
│   ├── dashboard/         # Area utente
│   └── admin/             # Pannello admin
├── components/
│   ├── ui/                # Componenti base
│   ├── layout/            # Layout (sidebar, ecc.)
│   └── features/          # Componenti funzionali
├── lib/
│   ├── db/                # Funzioni database
│   └── supabase/          # Client Supabase
├── store/                 # Zustand stores
└── types/                 # TypeScript types
```

## Conversione Mobile (futuro)

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
npx cap add android
npm run build && npx cap sync
```
