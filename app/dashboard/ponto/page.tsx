import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import PontoClientPage from "./client-page";

export default async function PontoPage() {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    if (!session.is_admin) {
        redirect("/dashboard");
    }

    const sql = getDb();
    const operatorsData = await sql`SELECT id, name FROM operators ORDER BY name`;
    const operators = operatorsData.map(op => ({ id: Number(op.id), name: String(op.name) }));

    return <PontoClientPage operators={operators} />;
}
