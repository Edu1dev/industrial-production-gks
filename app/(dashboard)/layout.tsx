import React from "react"
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardHeader } from "@/components/dashboard-header";
import { SWRProvider } from "@/components/swr-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <SWRProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <DashboardHeader operator={session} />
        <main className="flex-1">{children}</main>
      </div>
    </SWRProvider>
  );
}
