import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const sql = getDb();

  // Active/paused records for current operator
  const activeRecords = await sql`
    SELECT pr.*, p.code as part_code, p.description as part_description, p.material_cost,
           o.name as operation_name, o.machine_cost_per_hour,
           op.name as operator_name,
           c.name as company_name
    FROM production_records pr
    JOIN parts p ON pr.part_id = p.id
    JOIN operations o ON pr.operation_id = o.id
    JOIN operators op ON pr.operator_id = op.id
    LEFT JOIN companies c ON p.company_id = c.id
    WHERE pr.status IN ('EM_PRODUCAO', 'PAUSADO') AND pr.operator_id = ${session.id}
    ORDER BY pr.start_time DESC
  `;

  // If not admin, return only active records
  if (!session.is_admin) {
    return NextResponse.json({
      recentRecords: [],
      activeRecords,
      rankings: [],
      repeatedParts: [],
    });
  }

  // Recent production records
  const recentRecords = await sql`
    SELECT pr.*, p.code as part_code, p.description as part_description, p.material_cost,
           o.name as operation_name, o.machine_cost_per_hour,
           op.name as operator_name, op.id as operator_id,
           c.name as company_name
    FROM production_records pr
    JOIN parts p ON pr.part_id = p.id
    JOIN operations o ON pr.operation_id = o.id
    JOIN operators op ON pr.operator_id = op.id
    LEFT JOIN companies c ON p.company_id = c.id
    ORDER BY pr.start_time DESC
    LIMIT 20
  `;

  // Operator rankings - average time per piece for finished records
  const rankings = await sql`
    SELECT
      op.id as operator_id,
      op.name as operator_name,
      COUNT(pr.id) as total_records,
      ROUND(AVG(
        CASE WHEN pr.end_time IS NOT NULL AND pr.quantity > 0 THEN
          (EXTRACT(EPOCH FROM (pr.end_time - pr.start_time)) * 1000 - COALESCE(pr.total_pause_ms, 0)) / pr.quantity / 60000
        END
      )::numeric, 2) as avg_time_per_piece_min,
      ROUND(MIN(
        CASE WHEN pr.end_time IS NOT NULL AND pr.quantity > 0 THEN
          (EXTRACT(EPOCH FROM (pr.end_time - pr.start_time)) * 1000 - COALESCE(pr.total_pause_ms, 0)) / pr.quantity / 60000
        END
      )::numeric, 2) as best_time_per_piece_min
    FROM operators op
    LEFT JOIN production_records pr ON op.id = pr.operator_id AND pr.status = 'FINALIZADO'
    GROUP BY op.id, op.name
    HAVING COUNT(CASE WHEN pr.status = 'FINALIZADO' THEN 1 END) > 0
    ORDER BY avg_time_per_piece_min ASC
  `;

  // Parts with multiple productions (repeated parts)
  const repeatedParts = await sql`
    SELECT
      p.code as part_code,
      p.description,
      COUNT(pr.id) as production_count,
      ROUND(MIN(
        CASE WHEN pr.end_time IS NOT NULL AND pr.quantity > 0 THEN
          (EXTRACT(EPOCH FROM (pr.end_time - pr.start_time)) * 1000 - COALESCE(pr.total_pause_ms, 0)) / pr.quantity / 60000
        END
      )::numeric, 2) as best_time_min,
      ROUND(MAX(
        CASE WHEN pr.end_time IS NOT NULL AND pr.quantity > 0 THEN
          (EXTRACT(EPOCH FROM (pr.end_time - pr.start_time)) * 1000 - COALESCE(pr.total_pause_ms, 0)) / pr.quantity / 60000
        END
      )::numeric, 2) as worst_time_min
    FROM parts p
    JOIN production_records pr ON p.id = pr.part_id AND pr.status = 'FINALIZADO'
    GROUP BY p.id, p.code, p.description
    HAVING COUNT(pr.id) > 1
    ORDER BY COUNT(pr.id) DESC
    LIMIT 10
  `;

  return NextResponse.json({
    recentRecords,
    activeRecords,
    rankings,
    repeatedParts,
  });
}
