import { create } from "zustand";
import type { Profile, UserTeam } from "@/types";

interface AuthState {
  profile: Profile | null;
  team: UserTeam | null;
  isLoading: boolean;
  setProfile: (profile: Profile | null) => void;
  setTeam: (team: UserTeam | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  team: null,
  isLoading: true,
  setProfile: (profile) => set({ profile }),
  setTeam: (team) => set({ team }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ profile: null, team: null, isLoading: false }),
}));
