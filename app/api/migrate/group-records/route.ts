import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const sql = getDb();
  const partCodes = ["C121314", "C506215"];
  const results: any[] = [];

  for (const partCode of partCodes) {
    // 1. Find all ungrouped records for this part code
    const records = await sql`
      SELECT pr.id, pr.quantity, pr.charged_value, pr.start_time,
             p.code, p.description, p.company_id,
             o.name as operation_name
      FROM production_records pr
      JOIN parts p ON pr.part_id = p.id
      JOIN operations o ON pr.operation_id = o.id
      WHERE p.code = ${partCode} AND pr.group_id IS NULL
      ORDER BY
        CASE WHEN o.name ILIKE '%torno%' THEN 0 ELSE 1 END,
        pr.start_time ASC
    `;

    if (records.length < 2) {
      results.push({
        part_code: partCode,
        status: "skipped",
        reason: `Apenas ${records.length} registro(s) sem grupo - minimo 2 para agrupar`,
        records_found: records.length,
      });
      continue;
    }

    // 2. Create production group
    const group = await sql`
      INSERT INTO production_groups (part_code, part_description, quantity, company_id)
      VALUES (
        ${records[0].code},
        ${records[0].description || null},
        ${records[0].quantity},
        ${records[0].company_id || null}
      )
      RETURNING id
    `;
    const groupId = group[0].id;

    // 3. Update each record: first (Torno) gets seq=1 + keeps charged_value, rest get seq=2,3... + charged_value=0
    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const seq = i + 1;
      await sql`
        UPDATE production_records
        SET group_id = ${groupId},
            operation_sequence = ${seq},
            charged_value = ${seq === 1 ? rec.charged_value : 0}
        WHERE id = ${rec.id}
      `;
    }

    results.push({
      part_code: partCode,
      status: "grouped",
      group_id: groupId,
      records_count: records.length,
      operations: records.map((r: any, i: number) => ({
        id: r.id,
        operation: r.operation_name,
        sequence: i + 1,
        is_main: i === 0,
      })),
    });
  }

  return NextResponse.json({ success: true, results });
}
