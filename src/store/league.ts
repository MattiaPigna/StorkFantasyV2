import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { League, AppSettings } from "@/types";

interface LeagueState {
  activeLeague: League | null;
  myLeagues: League[];
  /** Cached app settings — not persisted, cleared on league switch */
  appSettings: AppSettings | null;
  setActiveLeague: (league: League | null) => void;
  setMyLeagues: (leagues: League[]) => void;
  setAppSettings: (s: AppSettings | null) => void;
  reset: () => void;
}

export const useLeagueStore = create<LeagueState>()(
  persist(
    (set) => ({
      activeLeague: null,
      myLeagues: [],
      appSettings: null,
      // Clear cached settings whenever the active league changes
      setActiveLeague: (league) => set({ activeLeague: league, appSettings: null }),
      setMyLeagues: (leagues) => set({ myLeagues: leagues }),
      setAppSettings: (appSettings) => set({ appSettings }),
      reset: () => set({ activeLeague: null, myLeagues: [], appSettings: null }),
    }),
    {
      name: "stork-league-store",
      // Only persist league selection — settings are always re-fetched fresh
      partialize: (state) => ({ activeLeague: state.activeLeague, myLeagues: state.myLeagues }),
    }
  )
);
