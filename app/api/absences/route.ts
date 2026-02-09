import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    // Only admin receives all? Or allow operators to see own?
    // Let's allow admin for now as requested "para o admin saber".
    if (!session.is_admin) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const operatorId = searchParams.get("operator_id");
    const date = searchParams.get("date");

    const sql = getDb();

    // Basic query
    // We want to list pauses that are NOT lunch or end of shift.
    // We join with production_records to get operator_id and part info.

    let targetOperatorId: number | null = null;
    if (operatorId && operatorId !== "all") {
        targetOperatorId = parseInt(operatorId);
    }

    const logs = await sql`
    SELECT 
      pl.id,
      pl.reason,
      pl.paused_at,
      pl.resumed_at,
      ROUND((EXTRACT(EPOCH FROM (COALESCE(pl.resumed_at, NOW()) - pl.paused_at)) / 60)::numeric, 1) as duration_minutes,
      pr.part_id, 
      p.code as part_code,
      op.name as operator_name
    FROM pause_logs pl
    JOIN production_records pr ON pl.production_record_id = pr.id
    JOIN operators op ON pr.operator_id = op.id
    LEFT JOIN parts p ON pr.part_id = p.id
    WHERE pl.reason NOT IN ('Almoço', 'Fim do turno')
      AND (${targetOperatorId}::int IS NULL OR pr.operator_id = ${targetOperatorId})
      AND (${date || null}::date IS NULL OR pl.paused_at::date = ${date}::date)
    ORDER BY pl.paused_at DESC
  `;

    return NextResponse.json({ logs });
}
