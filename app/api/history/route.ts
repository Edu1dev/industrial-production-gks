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
  const partCode = searchParams.get("part_code");
  const status = searchParams.get("status");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const companyId = searchParams.get("company_id");
  const limit = parseInt(searchParams.get("limit") || "100");
  const offset = parseInt(searchParams.get("offset") || "0");

  const sql = getDb();

  const records = await sql`
    SELECT
      pr.id, pr.status, pr.quantity, pr.start_time, pr.end_time,
      pr.total_pause_ms, pr.expected_time_minutes, pr.charged_value,
      pr.notes, pr.group_id, pr.operation_sequence,
      p.code as part_code, p.description as part_description, p.material_cost,
      o.name as operation_name, o.machine_cost_per_hour,
      op.name as operator_name, op.id as operator_id,
      c.name as company_name, p.company_id,
      pg.completed_at as group_completed_at,
      CASE WHEN pr.end_time IS NOT NULL AND pr.quantity > 0 THEN
        ROUND(((EXTRACT(EPOCH FROM (pr.end_time - pr.start_time)) * 1000 - COALESCE(pr.total_pause_ms, 0)) / 60000)::numeric, 2)
      ELSE NULL END as total_time_min,
      CASE WHEN pr.end_time IS NOT NULL AND pr.quantity > 0 THEN
        ROUND(((EXTRACT(EPOCH FROM (pr.end_time - pr.start_time)) * 1000 - COALESCE(pr.total_pause_ms, 0)) / pr.quantity / 60000)::numeric, 2)
      ELSE NULL END as time_per_piece_min,
      CASE WHEN pr.end_time IS NOT NULL AND pr.quantity > 0 THEN
        ROUND((o.machine_cost_per_hour * (EXTRACT(EPOCH FROM (pr.end_time - pr.start_time)) * 1000 - COALESCE(pr.total_pause_ms, 0)) / 3600000)::numeric, 2)
      ELSE NULL END as machine_cost,
      CASE WHEN pr.end_time IS NOT NULL AND pr.quantity > 0 THEN
        ROUND((p.material_cost * pr.quantity)::numeric, 2)
      ELSE NULL END as total_material_cost
    FROM production_records pr
    JOIN parts p ON pr.part_id = p.id
    JOIN operations o ON pr.operation_id = o.id
    JOIN operators op ON pr.operator_id = op.id
    LEFT JOIN companies c ON p.company_id = c.id
    LEFT JOIN production_groups pg ON pr.group_id = pg.id
    WHERE
      (${operatorId || null}::int IS NULL OR pr.operator_id = ${operatorId ? parseInt(operatorId) : null}::int)
      AND (${partCode || null}::text IS NULL OR p.code ILIKE '%' || ${partCode || ''} || '%')
      AND (${status || null}::text IS NULL OR pr.status = ${status || ''})
      AND (${dateFrom || null}::timestamp IS NULL OR pr.start_time >= ${dateFrom || '1970-01-01'}::timestamp)
      AND (${dateTo || null}::timestamp IS NULL OR pr.start_time <= (${dateTo || '2099-12-31'}::date + interval '1 day'))
      AND (${companyId || null}::int IS NULL OR p.company_id = ${companyId ? parseInt(companyId) : null}::int)
    ORDER BY pr.start_time DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  // Get total count for pagination
  const countResult = await sql`
    SELECT COUNT(*) as total
    FROM production_records pr
    JOIN parts p ON pr.part_id = p.id
    JOIN operations o ON pr.operation_id = o.id
    JOIN operators op ON pr.operator_id = op.id
    LEFT JOIN companies c ON p.company_id = c.id
    WHERE
      (${operatorId || null}::int IS NULL OR pr.operator_id = ${operatorId ? parseInt(operatorId) : null}::int)
      AND (${partCode || null}::text IS NULL OR p.code ILIKE '%' || ${partCode || ''} || '%')
      AND (${status || null}::text IS NULL OR pr.status = ${status || ''})
      AND (${dateFrom || null}::timestamp IS NULL OR pr.start_time >= ${dateFrom || '1970-01-01'}::timestamp)
      AND (${dateTo || null}::timestamp IS NULL OR pr.start_time <= (${dateTo || '2099-12-31'}::date + interval '1 day'))
      AND (${companyId || null}::int IS NULL OR p.company_id = ${companyId ? parseInt(companyId) : null}::int)
  `;

  // Calculate aggregated costs for groups
  const groupIds = [...new Set(records.filter((r: any) => r.group_id).map((r: any) => r.group_id))];
  let groupCosts: any = {};

  if (groupIds.length > 0) {
    const groupAggregates = await sql`
      SELECT 
        pr.group_id,
        COUNT(*) as operation_count,
        SUM(CASE WHEN pr.end_time IS NOT NULL THEN
          ROUND((o.machine_cost_per_hour * (EXTRACT(EPOCH FROM (pr.end_time - pr.start_time)) * 1000 - COALESCE(pr.total_pause_ms, 0)) / 3600000)::numeric, 2)
        ELSE 0 END) as total_machine_cost,
        MAX(pr.quantity) as quantity,
        MAX(p.material_cost) as material_cost
      FROM production_records pr
      JOIN operations o ON pr.operation_id = o.id
      JOIN parts p ON pr.part_id = p.id
      WHERE pr.group_id = ANY(${groupIds})
      GROUP BY pr.group_id
    `;

    groupAggregates.forEach((agg: any) => {
      const totalCost = parseFloat(agg.total_machine_cost || 0) + parseFloat(agg.material_cost || 0) * parseInt(agg.quantity || 0);
      groupCosts[agg.group_id] = {
        operation_count: parseInt(agg.operation_count),
        total_machine_cost: parseFloat(agg.total_machine_cost || 0),
        total_material_cost: parseFloat(agg.material_cost || 0) * parseInt(agg.quantity || 0),
        total_cost: totalCost,
        average_cost_per_piece: parseInt(agg.quantity) > 0 ? totalCost / parseInt(agg.quantity) : 0
      };
    });
  }

  return NextResponse.json({
    records,
    group_costs: groupCosts,
    total: parseInt(countResult[0].total as string),
    limit,
    offset,
  });
}

