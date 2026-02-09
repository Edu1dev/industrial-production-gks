import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";
import AusenciasClientPage from "./client-page";

export default async function AusenciasPage() {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    if (!session.is_admin) {
        // Only admins see absences page? Or operators see their own?
        // User requested: "para o admin saber".
        // I'll restrict to admin for now.
        redirect("/dashboard");
    }

    const sql = getDb();
    const operatorsData = await sql`SELECT id, name FROM operators ORDER BY name`;
    const operators = operatorsData.map(op => ({ id: Number(op.id), name: String(op.name) }));

    return <AusenciasClientPage operators={operators} />;
}
