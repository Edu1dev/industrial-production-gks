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
  const companyId = searchParams.get("company_id");
  const partCode = searchParams.get("part_code");

  const sql = getDb();

  const projects = await sql`
    SELECT p.*,
           c.name as company_name,
           op.name as created_by_name,
           (
             SELECT COUNT(*)::int FROM production_records pr
             WHERE pr.project_id = p.id AND pr.status = 'FINALIZADO'
           ) as completed_operations,
           (
             SELECT json_agg(json_build_object(
               'id', pr.id,
               'operation_name', o.name,
               'status', pr.status,
               'operator_name', opr.name,
               'start_time', pr.start_time,
               'end_time', pr.end_time
             ) ORDER BY pr.start_time)
             FROM production_records pr
             JOIN operations o ON pr.operation_id = o.id
             JOIN operators opr ON pr.operator_id = opr.id
             WHERE pr.project_id = p.id
           ) as operations_list
    FROM projects p
    JOIN companies c ON p.company_id = c.id
    LEFT JOIN operators op ON p.created_by = op.id
    WHERE (${status || null}::text IS NULL OR p.status = ${status})
      AND (${companyId ? parseInt(companyId) : null}::int IS NULL OR p.company_id = ${companyId ? parseInt(companyId) : null})
      AND (${partCode || null}::text IS NULL OR UPPER(p.part_code) LIKE '%' || UPPER(${partCode || ''}) || '%')
    ORDER BY
      CASE p.status
        WHEN 'EM_PRODUCAO' THEN 1
        WHEN 'PENDENTE' THEN 2
        WHEN 'FINALIZADO' THEN 3
      END,
      p.created_at DESC
  `;

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  if (!session.is_admin) {
    return NextResponse.json({ error: "Acesso negado: apenas administradores" }, { status: 403 });
  }

  const {
    part_code,
    company_id,
    quantity,
    description,
    estimated_time_minutes,
    charged_value_per_piece,
    material_cost,
  } = await request.json();

  if (!part_code || !company_id || !quantity) {
    return NextResponse.json(
      { error: "Codigo da peca, empresa e quantidade sao obrigatorios" },
      { status: 400 },
    );
  }

  if (!description) {
    return NextResponse.json(
      { error: "Descricao e obrigatoria" },
      { status: 400 },
    );
  }

  const sql = getDb();

  try {
    const project = await sql`
      INSERT INTO projects (part_code, company_id, quantity, description, estimated_time_minutes, charged_value_per_piece, material_cost, created_by)
      VALUES (${part_code.toUpperCase()}, ${company_id}, ${quantity}, ${description}, ${estimated_time_minutes || null}, ${charged_value_per_piece || 0}, ${material_cost || 0}, ${session.id})
      RETURNING *
    `;

    return NextResponse.json({ project: project[0] });
  } catch (error: any) {
    if (error.message?.includes("idx_projects_active_code")) {
      return NextResponse.json(
        { error: "Ja existe um projeto ativo com este codigo de peca" },
        { status: 409 },
      );
    }
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao criar projeto" },
      { status: 500 },
    );
  }
}
