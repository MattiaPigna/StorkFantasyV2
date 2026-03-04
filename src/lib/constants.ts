import type { RuleEntry } from "@/types";

// ==================== SCORING RULES ====================

export const DEFAULT_BONUS_RULES: Omit<RuleEntry, "id">[] = [
  { key: "goal", label: "Gol Segnato", points: 3, type: "bonus", description: "Gol segnato da un giocatore di movimento" },
  { key: "goal_goalkeeper", label: "Gol del Portiere", points: 6, type: "bonus", description: "Gol segnato dal portiere" },
  { key: "assist", label: "Assist", points: 1, type: "bonus", description: "Assistenza decisiva per un gol" },
  { key: "penalty_saved", label: "Rigore Parato", points: 3, type: "bonus", description: "Rigore parato dal portiere" },
  { key: "clean_sheet_goalkeeper", label: "Porta Inviolata (P)", points: 1, type: "bonus", description: "Partita senza subire gol - portiere" },
  { key: "high_vote", label: "Voto Alto (≥7)", points: 1, type: "bonus", description: "Voto pari o superiore a 7" },
  { key: "top_vote", label: "Voto Top (≥8)", points: 2, type: "bonus", description: "Voto pari o superiore a 8" },
];

export const DEFAULT_MALUS_RULES: Omit<RuleEntry, "id">[] = [
  { key: "own_goal", label: "Autogol", points: -2, type: "malus" },
  { key: "yellow_card", label: "Ammonizione", points: -0.5, type: "malus" },
  { key: "red_card", label: "Espulsione", points: -1, type: "malus" },
  { key: "penalty_missed", label: "Rigore Sbagliato", points: -2, type: "malus" },
  { key: "penalty_conceded", label: "Rigore Subito (P)", points: -1, type: "malus", description: "Rigore concesso dal portiere" },
  { key: "low_vote", label: "Voto Basso (≤4)", points: -1, type: "malus" },
];

// ==================== PLAYER ROLES ====================

export const PLAYER_ROLE_LABELS: Record<string, string> = {
  P: "Portiere",
  M: "Giocatore di Movimento",
};

export const PLAYER_ROLE_COLORS: Record<string, string> = {
  P: "bg-stork-gold/20 text-stork-gold border-stork-gold/30",
  M: "bg-stork-orange/20 text-stork-orange border-stork-orange/30",
};

// ==================== SPONSOR TYPES ====================

export const SPONSOR_TYPE_LABELS: Record<string, string> = {
  main: "Main Sponsor",
  partner: "Partner",
  technical: "Sponsor Tecnico",
};

// ==================== NAVIGATION ====================

export const DASHBOARD_NAV_ITEMS = [
  { href: "/dashboard/home", label: "Home", icon: "Home" },
  { href: "/dashboard/lineup", label: "Il Mio Campo", icon: "LayoutGrid" },
  { href: "/dashboard/market", label: "Mercato", icon: "ShoppingCart" },
  { href: "/dashboard/standings", label: "Classifica", icon: "Trophy" },
  { href: "/dashboard/rules", label: "Regole", icon: "BookOpen" },
  { href: "/dashboard/cards", label: "Card", icon: "CreditCard" },
] as const;

export const ADMIN_NAV_ITEMS = [
  { href: "/admin/matchdays", label: "Giornate", icon: "Calendar" },
  { href: "/admin/players", label: "Giocatori", icon: "Users" },
  { href: "/admin/rules", label: "Regole", icon: "Star" },
  { href: "/admin/cards", label: "Card Speciali", icon: "CreditCard" },
  { href: "/admin/tournament", label: "Torneo", icon: "Trophy" },
  { href: "/admin/sponsors", label: "Sponsor", icon: "Building" },
  { href: "/admin/settings", label: "Impostazioni", icon: "Settings" },
] as const;

// ==================== MISC ====================

export const MAX_SQUAD_SIZE = 15;
export const MIN_SQUAD_SIZE = 11;
export const LINEUP_SIZE = 11;
export const INITIAL_CREDITS = 250;
