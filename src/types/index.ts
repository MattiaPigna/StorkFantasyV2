// ==================== LEAGUE ====================

export interface League {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  is_active: boolean;
  created_at: string;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  joined_at: string;
}

// ==================== PLAYER TYPES ====================

export type PlayerRole = "P" | "M";

export interface Player {
  id: string;
  name: string;
  team: string;
  role: PlayerRole;
  price: number;
  is_active: boolean;
  created_at?: string;
}

// ==================== MATCH STATS ====================

export interface PlayerMatchStats {
  player_id: string;
  matchday_id: string;
  vote: number | null;
  goals: number;
  assists: number;
  own_goals: number;
  yellow_cards: number;
  red_cards: number;
  penalty_missed: number;
  penalty_saved: number;
  goals_conceded: number;
  bonus_points: number;
  malus_points: number;
  fantasy_points: number | null;
}

// ==================== MATCHDAY ====================

export type MatchdayStatus = "open" | "calculated" | "locked";

export interface Matchday {
  id: string;
  number: number;
  name: string;
  status: MatchdayStatus;
  created_at: string;
  stats?: PlayerMatchStats[];
}

// ==================== USER & TEAM ====================

export interface Profile {
  id: string;
  email: string;
  team_name: string;
  manager_name: string;
  is_admin: boolean;
  is_super_admin?: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface UserTeam {
  id: string;
  user_id: string;
  players: string[]; // player IDs
  lineup: LineupSlot[];
  credits: number;
  total_points: number;
  matchday_points: Record<string, number>; // matchday_id -> points
}

export interface LineupSlot {
  position: number; // 1-11
  player_id: string | null;
  x?: number; // percentage position on pitch
  y?: number;
}

// ==================== FANTASY RULES ====================

export interface RuleEntry {
  id: string;
  key: string;
  label: string;
  points: number;
  type: "bonus" | "malus";
  category?: "partita" | "spettacolo";
  description?: string;
}

// ==================== APP SETTINGS ====================

export interface AppSettings {
  id: string;
  market_open: boolean;
  lineup_locked: boolean;
  market_deadline: string | null;
  youtube_url: string | null;
  marquee_text: string | null;
  max_players_per_team: number;
  lineup_size: number;
  initial_credits: number;
  updated_at: string;
}

// ==================== SPONSOR ====================

export interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  type: "main" | "partner" | "technical";
  is_active: boolean;
  created_at: string;
}

// ==================== SPECIAL CARDS ====================

export interface SpecialCard {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  effect: string | null;
  created_at: string;
}

// ==================== TOURNAMENT ====================

export interface TournamentRules {
  id: string;
  content_html: string | null;
  pdf_url: string | null;
  updated_at: string;
}

// ==================== TRANSFER MARKET ====================

export interface MarketListing {
  id: string;
  league_id: string;
  player_id: string;
  seller_id: string;
  seller_team_id: string;
  price: number;
  created_at: string;
  player?: Player;
  seller?: Profile;
}

// ==================== STANDINGS ====================

export interface StandingEntry {
  rank: number;
  team_name: string;
  manager_name: string;
  total_points: number;
  user_id: string;
  matchday_points?: Record<string, number>;
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
