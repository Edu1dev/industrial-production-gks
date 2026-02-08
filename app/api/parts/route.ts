import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  const sql = getDb();

  if (code) {
    // Search for a specific part by code
    const parts =
      await sql`SELECT id, code, description, material_cost, created_at FROM parts WHERE code = ${code}`;

    if (parts.length === 0) {
      return NextResponse.json({ part: null, history: [] });
    }

    const part = parts[0];

    // Get production history for this part
    const history = await sql`
      SELECT 
        pr.id, pr.status, pr.quantity, pr.start_time, pr.end_time,
        pr.total_pause_ms, pr.expected_time_minutes, pr.charged_value, pr.notes,
        o.name as operation_name, o.machine_cost_per_hour,
        op.name as operator_name, op.id as operator_id
      FROM production_records pr
      JOIN operations o ON pr.operation_id = o.id
      JOIN operators op ON pr.operator_id = op.id
      WHERE pr.part_id = ${part.id}
      ORDER BY pr.start_time DESC
    `;

    return NextResponse.json({ part, history });
  }

  // Return all parts
  const parts =
    await sql`SELECT id, code, description, material_cost, created_at FROM parts ORDER BY created_at DESC LIMIT 50`;
  return NextResponse.json({ parts });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { code, description, material_cost } = await request.json();

  if (!code) {
    return NextResponse.json(
      { error: "Codigo da peca e obrigatorio" },
      { status: 400 },
    );
  }

  const sql = getDb();

  // Upsert - create if not exists
  const result = await sql`
    INSERT INTO parts (code, description, material_cost)
    VALUES (${code.toUpperCase()}, ${description || null}, ${material_cost || 0})
    ON CONFLICT (code) DO UPDATE SET
      description = COALESCE(${description || null}, parts.description),
      material_cost = CASE WHEN ${material_cost || 0} > 0 THEN ${material_cost || 0} ELSE parts.material_cost END
    RETURNING id, code, description, material_cost
  `;

  return NextResponse.json({ part: result[0] });
}
