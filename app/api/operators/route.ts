import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const sql = getDb();

  // Operators with performance stats
  const operators = await sql`
    SELECT 
      op.id,
      op.name,
      op.login,
      op.created_at,
      COUNT(CASE WHEN pr.status = 'FINALIZADO' THEN 1 END) as total_finished,
      COUNT(CASE WHEN pr.status IN ('EM_PRODUCAO', 'PAUSADO') THEN 1 END) as active_count,
      ROUND(AVG(
        CASE WHEN pr.end_time IS NOT NULL AND pr.quantity > 0 THEN
          (EXTRACT(EPOCH FROM (pr.end_time - pr.start_time)) * 1000 - COALESCE(pr.total_pause_ms, 0)) / pr.quantity / 60000
        END
      )::numeric, 2) as avg_time_per_piece_min,
      ROUND(MIN(
        CASE WHEN pr.end_time IS NOT NULL AND pr.quantity > 0 THEN
          (EXTRACT(EPOCH FROM (pr.end_time - pr.start_time)) * 1000 - COALESCE(pr.total_pause_ms, 0)) / pr.quantity / 60000
        END
      )::numeric, 2) as best_time_per_piece_min,
      ROUND(MAX(
        CASE WHEN pr.end_time IS NOT NULL AND pr.quantity > 0 THEN
          (EXTRACT(EPOCH FROM (pr.end_time - pr.start_time)) * 1000 - COALESCE(pr.total_pause_ms, 0)) / pr.quantity / 60000
        END
      )::numeric, 2) as worst_time_per_piece_min,
      COALESCE((
        SELECT SUM(DISTINCT_PIECES.quantity) FROM (
          -- Records with project_id: count quantity once per project
          SELECT MAX(pr2.quantity) as quantity
          FROM production_records pr2
          WHERE pr2.operator_id = op.id
            AND pr2.status = 'FINALIZADO'
            AND pr2.project_id IS NOT NULL
          GROUP BY pr2.project_id

          UNION ALL

          -- Records without project_id (legacy): one per group_id or id
          SELECT MAX(pr2.quantity) as quantity
          FROM production_records pr2
          WHERE pr2.operator_id = op.id
            AND pr2.status = 'FINALIZADO'
            AND pr2.project_id IS NULL
          GROUP BY COALESCE(pr2.group_id::text, pr2.id::text)
        ) AS DISTINCT_PIECES
      ), 0) as total_pieces
    FROM operators op
    LEFT JOIN production_records pr ON op.id = pr.operator_id
    GROUP BY op.id, op.name, op.login, op.created_at
    ORDER BY op.name ASC
  `;

  return NextResponse.json({ operators });
}
