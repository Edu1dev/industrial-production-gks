import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const sql = getDb();

  const projects = await sql`
    SELECT p.*,
           c.name as company_name,
           op.name as created_by_name
    FROM projects p
    JOIN companies c ON p.company_id = c.id
    LEFT JOIN operators op ON p.created_by = op.id
    WHERE p.id = ${parseInt(id)}
  `;

  if (projects.length === 0) {
    return NextResponse.json({ error: "Projeto nao encontrado" }, { status: 404 });
  }

  const project = projects[0];

  // Get operations history for this project
  const operations = await sql`
    SELECT pr.id, pr.status, pr.quantity, pr.start_time, pr.end_time,
           pr.total_pause_ms, pr.charged_value, pr.expected_time_minutes,
           o.name as operation_name, o.machine_cost_per_hour,
           opr.name as operator_name
    FROM production_records pr
    JOIN operations o ON pr.operation_id = o.id
    JOIN operators opr ON pr.operator_id = opr.id
    WHERE pr.project_id = ${parseInt(id)}
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
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  if (!session.is_admin) {
    return NextResponse.json({ error: "Acesso negado: apenas administradores" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const sql = getDb();

  const existing = await sql`SELECT * FROM projects WHERE id = ${parseInt(id)}`;
  if (existing.length === 0) {
    return NextResponse.json({ error: "Projeto nao encontrado" }, { status: 404 });
  }

  const project = existing[0];

  // Reopen a finished project
  if (body.action === "reopen") {
    if (project.status !== "FINALIZADO") {
      return NextResponse.json({ error: "Apenas projetos finalizados podem ser reabertos" }, { status: 400 });
    }

    const updated = await sql`
      UPDATE projects
      SET status = 'PENDENTE', completed_at = NULL
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    return NextResponse.json({ project: updated[0] });
  }

  // Edit a pending project
  if (project.status !== "PENDENTE") {
    return NextResponse.json({ error: "Apenas projetos pendentes podem ser editados" }, { status: 400 });
  }

  const {
    part_code,
    company_id,
    quantity,
    description,
    estimated_time_minutes,
    charged_value_per_piece,
    material_cost,
  } = body;

  try {
    const updated = await sql`
      UPDATE projects
      SET part_code = COALESCE(${part_code ? part_code.toUpperCase() : null}, part_code),
          company_id = COALESCE(${company_id || null}::int, company_id),
          quantity = COALESCE(${quantity || null}::int, quantity),
          description = COALESCE(${description || null}, description),
          estimated_time_minutes = CASE WHEN ${estimated_time_minutes !== undefined} THEN ${estimated_time_minutes ?? null}::decimal ELSE estimated_time_minutes END,
          charged_value_per_piece = COALESCE(${charged_value_per_piece ?? null}::decimal, charged_value_per_piece),
          material_cost = CASE WHEN ${material_cost !== undefined} THEN ${material_cost ?? null}::decimal ELSE material_cost END
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    return NextResponse.json({ project: updated[0] });
  } catch (error: any) {
    if (error.message?.includes("idx_projects_active_code")) {
      return NextResponse.json(
        { error: "Ja existe um projeto ativo com este codigo de peca" },
        { status: 409 },
      );
    }
    console.error("Update project error:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao atualizar projeto" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  if (!session.is_admin) {
    return NextResponse.json({ error: "Acesso negado: apenas administradores" }, { status: 403 });
  }

  const { id } = await params;
  const sql = getDb();

  const existing = await sql`SELECT * FROM projects WHERE id = ${parseInt(id)}`;
  if (existing.length === 0) {
    return NextResponse.json({ error: "Projeto nao encontrado" }, { status: 404 });
  }

  const projectId = parseInt(id);

  // Delete linked pause_logs
  await sql`
    DELETE FROM pause_logs WHERE production_record_id IN (
      SELECT id FROM production_records WHERE project_id = ${projectId}
    )
  `;

  // Delete linked time_records
  await sql`
    DELETE FROM time_records WHERE production_record_id IN (
      SELECT id FROM production_records WHERE project_id = ${projectId}
    )
  `;

  // Delete linked production records
  await sql`DELETE FROM production_records WHERE project_id = ${projectId}`;

  // Delete the project
  await sql`DELETE FROM projects WHERE id = ${projectId}`;

  return NextResponse.json({ success: true });
}
