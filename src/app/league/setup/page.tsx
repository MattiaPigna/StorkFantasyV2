import { Suspense } from "react";
import { LeagueSetup } from "@/components/features/league/league-setup";

export default function LeagueSetupPage() {
  return (
    <Suspense>
      <LeagueSetup />
    </Suspense>
  );
}
