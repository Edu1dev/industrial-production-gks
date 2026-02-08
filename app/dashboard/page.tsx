import { DashboardContent } from "@/components/dashboard-content";
import { getSession } from "@/lib/auth";

export default async function Page() {
  const session = await getSession();
  return <DashboardContent operator={session} />;
}
