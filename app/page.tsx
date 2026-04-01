import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getDashboardSnapshot } from "@/lib/openclaw/service";

export default async function HomePage() {
  const initialSnapshot = await getDashboardSnapshot();

  return <DashboardShell initialSnapshot={initialSnapshot} />;
}
