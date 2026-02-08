import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const operatorId = searchParams.get("operator_id");

  const sql = getDb();

  let records;
  if (status && operatorId) {
    records = await sql`
      SELECT pr.*, p.code as part_code, p.description as part_description, p.material_cost,
             o.name as operation_name, o.machine_cost_per_hour,
             op.name as operator_name
      FROM production_records pr
      JOIN parts p ON pr.part_id = p.id
      JOIN operations o ON pr.operation_id = o.id
      JOIN operators op ON pr.operator_id = op.id
      WHERE pr.status = ${status} AND pr.operator_id = ${parseInt(operatorId)}
      ORDER BY pr.start_time DESC
    `;
  } else if (status) {
    records = await sql`
      SELECT pr.*, p.code as part_code, p.description as part_description, p.material_cost,
             o.name as operation_name, o.machine_cost_per_hour,
             op.name as operator_name
      FROM production_records pr
      JOIN parts p ON pr.part_id = p.id
      JOIN operations o ON pr.operation_id = o.id
      JOIN operators op ON pr.operator_id = op.id
      WHERE pr.status = ${status}
      ORDER BY pr.start_time DESC
    `;
  } else {
    records = await sql`
      SELECT pr.*, p.code as part_code, p.description as part_description, p.material_cost,
             o.name as operation_name, o.machine_cost_per_hour,
             op.name as operator_name
      FROM production_records pr
      JOIN parts p ON pr.part_id = p.id
      JOIN operations o ON pr.operation_id = o.id
      JOIN operators op ON pr.operator_id = op.id
      ORDER BY pr.start_time DESC
      LIMIT 50
    `;
  }

  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const {
    part_code,
    part_description,
    operation_id,
    quantity,
    expected_time_minutes,
    charged_value,
    material_cost,
  } = await request.json();

  if (!part_code || !operation_id || !quantity) {
    return NextResponse.json(
      { error: "Codigo da peca, operacao e quantidade sao obrigatorios" },
      { status: 400 },
    );
  }

  const sql = getDb();

  // Upsert the part
  const partResult = await sql`
    INSERT INTO parts (code, description, material_cost)
    VALUES (${part_code.toUpperCase()}, ${part_description || null}, ${material_cost || 0})
    ON CONFLICT (code) DO UPDATE SET
      description = COALESCE(${part_description || null}, parts.description),
      material_cost = CASE WHEN ${material_cost || 0} > 0 THEN ${material_cost || 0} ELSE parts.material_cost END
    RETURNING id, code, description, material_cost
  `;

  const part = partResult[0];

  // Create production record
  const record = await sql`
    INSERT INTO production_records (part_id, operation_id, operator_id, quantity, expected_time_minutes, charged_value, status, start_time)
    VALUES (${part.id}, ${operation_id}, ${session.id}, ${quantity}, ${expected_time_minutes || null}, ${charged_value || 0}, 'EM_PRODUCAO', NOW())
    RETURNING *
  `;

  return NextResponse.json({ record: record[0], part });
}
