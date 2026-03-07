import { redirect } from "next/navigation";

export default function SuperAdminRoot() {
  redirect("/superadmin/leagues");
}
