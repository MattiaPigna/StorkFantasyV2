import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { League } from "@/types";

interface LeagueState {
  activeLeague: League | null;
  myLeagues: League[];
  setActiveLeague: (league: League | null) => void;
  setMyLeagues: (leagues: League[]) => void;
  reset: () => void;
}

export const useLeagueStore = create<LeagueState>()(
  persist(
    (set) => ({
      activeLeague: null,
      myLeagues: [],
      setActiveLeague: (league) => set({ activeLeague: league }),
      setMyLeagues: (leagues) => set({ myLeagues: leagues }),
      reset: () => set({ activeLeague: null, myLeagues: [] }),
    }),
    { name: "stork-league-store" }
  )
);
