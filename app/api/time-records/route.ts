import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const operatorId = searchParams.get("operator_id");
  const date = searchParams.get("date");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  const sql = getDb();

  // Admin can see all, operators can only see their own
  let targetOperatorId: number | null = session.id;

  if (session.is_admin) {
    if (operatorId === "all") {
      targetOperatorId = null;
    } else if (operatorId) {
      targetOperatorId = parseInt(operatorId);
    }
  }

  let records;

  if (date) {
    // Single date
    records = await sql`
      SELECT tr.*, op.name as operator_name
      FROM time_records tr
      JOIN operators op ON tr.operator_id = op.id
      WHERE (${targetOperatorId}::int IS NULL OR tr.operator_id = ${targetOperatorId})
        AND tr.record_date = ${date}
      ORDER BY op.name ASC, tr.clock_in ASC
    `;
  } else if (startDate && endDate) {
    // Date range
    records = await sql`
      SELECT tr.*, op.name as operator_name
      FROM time_records tr
      JOIN operators op ON tr.operator_id = op.id
      WHERE (${targetOperatorId}::int IS NULL OR tr.operator_id = ${targetOperatorId})
        AND tr.record_date BETWEEN ${startDate} AND ${endDate}
      ORDER BY tr.record_date DESC, op.name ASC, tr.clock_in ASC
    `;
  } else {
    // Default: today
    records = await sql`
      SELECT tr.*, op.name as operator_name
      FROM time_records tr
      JOIN operators op ON tr.operator_id = op.id
      WHERE (${targetOperatorId}::int IS NULL OR tr.operator_id = ${targetOperatorId})
        AND tr.record_date = CURRENT_DATE
      ORDER BY op.name ASC, tr.clock_in ASC
    `;
  }

  // Calculate daily totals
  const dailyTotals: Record<string, number> = {};
  for (const rec of records) {
    const dateKey = rec.record_date.toISOString().split("T")[0];
    dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + (rec.worked_minutes || 0);
  }

  return NextResponse.json({ records, dailyTotals });
}

// Admin-only: create manual time record
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  if (!session.is_admin) {
    return NextResponse.json(
      { error: "Acesso negado: apenas administradores" },
      { status: 403 }
    );
  }

  const { operator_id, date, clock_in, clock_out, reason } = await request.json();

  if (!operator_id || !date || !clock_in) {
    return NextResponse.json(
      { error: "Operador, data e hora de entrada sao obrigatorios" },
      { status: 400 }
    );
  }

  const sql = getDb();

  // Calculate worked minutes if clock_out is provided
  let workedMinutes = null;
  if (clock_out) {
    const inTime = new Date(clock_in).getTime();
    const outTime = new Date(clock_out).getTime();
    workedMinutes = Math.round((outTime - inTime) / 60000);
  }

  const result = await sql`
    INSERT INTO time_records (operator_id, record_date, clock_in, clock_out, reason, worked_minutes)
    VALUES (${operator_id}, ${date}, ${clock_in}, ${clock_out || null}, ${reason || null}, ${workedMinutes})
    RETURNING *
  `;

  return NextResponse.json({ record: result[0] });
}
