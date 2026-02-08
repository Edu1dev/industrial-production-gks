import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session?.is_admin) {
        redirect("/dashboard/historico");
    }

    return <>{children}</>;
}
