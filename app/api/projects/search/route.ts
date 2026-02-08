import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const partCode = searchParams.get("part_code");

  if (!partCode) {
    return NextResponse.json({ error: "part_code e obrigatorio" }, { status: 400 });
  }

  const sql = getDb();

  try {
    // Find active project by exact code match (case-insensitive)
    const projects = await sql`
      SELECT p.*,
             c.name as company_name,
             op.name as created_by_name
      FROM projects p
      JOIN companies c ON p.company_id = c.id
      LEFT JOIN operators op ON p.created_by = op.id
      WHERE UPPER(p.part_code) = UPPER(${partCode})
        AND p.status != 'FINALIZADO'
      LIMIT 1
    `;

    if (projects.length === 0) {
      return NextResponse.json({ error: "Projeto nao encontrado" }, { status: 404 });
    }

    const project = projects[0];

    // Get operations already done on this project
    const operations = await sql`
      SELECT pr.id, pr.status, pr.quantity, pr.start_time, pr.end_time,
             pr.total_pause_ms, pr.charged_value, pr.expected_time_minutes,
             o.name as operation_name, o.machine_cost_per_hour,
             opr.name as operator_name
      FROM production_records pr
      JOIN operations o ON pr.operation_id = o.id
      JOIN operators opr ON pr.operator_id = opr.id
      WHERE pr.project_id = ${project.id}
      ORDER BY pr.start_time
    `;

    // Get best time per piece from historical records with same part_code
    const bestTime = await sql`
      SELECT MIN(
        (EXTRACT(EPOCH FROM (pr.end_time - pr.start_time)) * 1000 - COALESCE(pr.total_pause_ms, 0))
        / NULLIF(pr.quantity, 0)
      ) as best_time_per_piece_ms
      FROM production_records pr
      JOIN parts pt ON pr.part_id = pt.id
      WHERE UPPER(pt.code) = UPPER(${project.part_code})
        AND pr.status = 'FINALIZADO'
        AND pr.end_time IS NOT NULL
        AND pr.quantity > 0
    `;

    return NextResponse.json({
      project,
      operations,
      best_time_per_piece_ms: bestTime[0]?.best_time_per_piece_ms || null,
    });
  } catch (error: any) {
    console.error("Project search error:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar projeto" },
      { status: 500 },
    );
  }
}
