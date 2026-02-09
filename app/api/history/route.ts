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
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  const sql = getDb();

  // Step 1: Get paginated display groups (each group_id counts as 1, solo records count as 1)
  const displayGroups = await sql`
    SELECT
      COALESCE(pr.group_id, -pr.id) as display_key,
      MIN(pr.start_time) as group_start
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
    GROUP BY COALESCE(pr.group_id, -pr.id)
    ORDER BY group_start DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  // Extract group_ids (positive) and solo record ids (negative -> abs)
  const displayKeys = displayGroups.map((dg: any) => parseInt(dg.display_key));
  const groupIds = displayKeys.filter((k: number) => k > 0);
  const soloIds = displayKeys.filter((k: number) => k < 0).map((k: number) => -k);

  // Step 2: Fetch ALL records for those display groups (complete groups, not filtered)
  let records: any[] = [];
  if (displayKeys.length > 0) {
    records = await sql`
      SELECT
        pr.id, pr.status, pr.quantity, pr.start_time, pr.end_time,
        pr.total_pause_ms, pr.expected_time_minutes, pr.charged_value,
        pr.notes, pr.group_id, pr.operation_sequence,
        p.code as part_code, p.description as part_description, p.material_cost,
        o.name as operation_name, 
        ROUND(o.machine_cost_per_hour / 1.667, 2) as base_cost_per_hour,
        o.machine_cost_per_hour,
        op.name as operator_name, op.id as operator_id,
        c.name as company_name, p.company_id,
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
      WHERE
        (pr.group_id = ANY(${groupIds.length > 0 ? groupIds : [0]}) OR pr.id = ANY(${soloIds.length > 0 ? soloIds : [0]}))
      ORDER BY
        COALESCE(
          (SELECT MIN(pr2.start_time) FROM production_records pr2 WHERE pr2.group_id = pr.group_id),
          pr.start_time
        ) DESC,
        pr.operation_sequence ASC NULLS FIRST
    `;
  }

  // Step 3: Count total display groups (for pagination)
  const countResult = await sql`
    SELECT COUNT(*) as total FROM (
      SELECT COALESCE(pr.group_id, -pr.id) as display_key
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
      GROUP BY COALESCE(pr.group_id, -pr.id)
    ) sub
  `;

  return NextResponse.json({
    records,
    total: parseInt(countResult[0].total as string),
    limit,
    offset,
  });
}
