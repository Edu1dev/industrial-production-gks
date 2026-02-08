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
             op.name as operator_name,
             c.name as company_name,
             pr.project_id
      FROM production_records pr
      JOIN parts p ON pr.part_id = p.id
      JOIN operations o ON pr.operation_id = o.id
      JOIN operators op ON pr.operator_id = op.id
      LEFT JOIN companies c ON p.company_id = c.id
      WHERE pr.status = ${status} AND pr.operator_id = ${parseInt(operatorId)}
      ORDER BY pr.start_time DESC
    `;
  } else if (status) {
    records = await sql`
      SELECT pr.*, p.code as part_code, p.description as part_description, p.material_cost,
             o.name as operation_name, o.machine_cost_per_hour,
             op.name as operator_name,
             c.name as company_name,
             pr.project_id
      FROM production_records pr
      JOIN parts p ON pr.part_id = p.id
      JOIN operations o ON pr.operation_id = o.id
      JOIN operators op ON pr.operator_id = op.id
      LEFT JOIN companies c ON p.company_id = c.id
      WHERE pr.status = ${status}
      ORDER BY pr.start_time DESC
    `;
  } else {
    records = await sql`
      SELECT pr.*, p.code as part_code, p.description as part_description, p.material_cost,
             o.name as operation_name, o.machine_cost_per_hour,
             op.name as operator_name,
             c.name as company_name,
             pr.project_id
      FROM production_records pr
      JOIN parts p ON pr.part_id = p.id
      JOIN operations o ON pr.operation_id = o.id
      JOIN operators op ON pr.operator_id = op.id
      LEFT JOIN companies c ON p.company_id = c.id
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

  const body = await request.json();

  // New project-based flow
  if (body.project_id) {
    const { project_id, operation_id } = body;

    if (!operation_id) {
      return NextResponse.json(
        { error: "Operacao e obrigatoria" },
        { status: 400 },
      );
    }

    const sql = getDb();

    try {
      // Get project data
      const projects = await sql`
        SELECT * FROM projects WHERE id = ${project_id}
      `;

      if (projects.length === 0) {
        return NextResponse.json({ error: "Projeto nao encontrado" }, { status: 404 });
      }

      const project = projects[0];

      if (project.status === "FINALIZADO") {
        return NextResponse.json({ error: "Projeto ja finalizado" }, { status: 400 });
      }

      // Upsert part from project data
      const materialCost = Number(project.material_cost) || 0;
      const partResult = await sql`
        INSERT INTO parts (code, description, material_cost, company_id)
        VALUES (${project.part_code.toUpperCase()}, ${project.description || null}, ${materialCost}, ${project.company_id})
        ON CONFLICT (code, company_id) WHERE company_id IS NOT NULL DO UPDATE SET
          description = COALESCE(${project.description || null}, parts.description),
          material_cost = CASE WHEN ${materialCost} > 0 THEN ${materialCost} ELSE parts.material_cost END
        RETURNING id, code, description, material_cost, company_id
      `;

      const part = partResult[0];

      // Calculate estimated_time_minutes from project's estimated_time_hours
      const estimatedTimeMinutes = project.estimated_time_hours
        ? Number(project.estimated_time_hours) * 60
        : null;
      const chargedValue = Number(project.charged_value_per_piece) || 0;

      // Create production record linked to project
      const record = await sql`
        INSERT INTO production_records (part_id, operation_id, operator_id, quantity, expected_time_minutes, charged_value, status, start_time, project_id)
        VALUES (${part.id}, ${operation_id}, ${session.id}, ${project.quantity}, ${estimatedTimeMinutes}, ${chargedValue}, 'EM_PRODUCAO', NOW(), ${project_id})
        RETURNING *
      `;

      // Update project status to EM_PRODUCAO
      await sql`
        UPDATE projects SET status = 'EM_PRODUCAO' WHERE id = ${project_id}
      `;

      return NextResponse.json({ record: record[0], part });
    } catch (error: any) {
      console.error("Start production from project error:", error);
      return NextResponse.json(
        { error: error.message || "Erro ao iniciar producao" },
        { status: 500 },
      );
    }
  }

  // Legacy flow (direct production without project)
  const {
    part_code,
    part_description,
    operation_id,
    quantity,
    expected_time_minutes,
    charged_value,
    material_cost,
    company_id,
  } = body;

  if (!part_code || !operation_id || !quantity) {
    return NextResponse.json(
      { error: "Codigo da peca, operacao e quantidade sao obrigatorios" },
      { status: 400 },
    );
  }

  if (!company_id) {
    return NextResponse.json(
      { error: "Empresa e obrigatoria" },
      { status: 400 },
    );
  }

  const sql = getDb();

  // Upsert the part with company_id
  let partResult;
  if (company_id) {
    partResult = await sql`
      INSERT INTO parts (code, description, material_cost, company_id)
      VALUES (${part_code.toUpperCase()}, ${part_description || null}, ${material_cost || 0}, ${company_id})
      ON CONFLICT (code, company_id) WHERE company_id IS NOT NULL DO UPDATE SET
        description = COALESCE(${part_description || null}, parts.description),
        material_cost = CASE WHEN ${material_cost || 0} > 0 THEN ${material_cost || 0} ELSE parts.material_cost END
      RETURNING id, code, description, material_cost, company_id
    `;
  } else {
    partResult = await sql`
      INSERT INTO parts (code, description, material_cost)
      VALUES (${part_code.toUpperCase()}, ${part_description || null}, ${material_cost || 0})
      ON CONFLICT (code) WHERE company_id IS NULL DO UPDATE SET
        description = COALESCE(${part_description || null}, parts.description),
        material_cost = CASE WHEN ${material_cost || 0} > 0 THEN ${material_cost || 0} ELSE parts.material_cost END
      RETURNING id, code, description, material_cost, company_id
    `;
  }

  const part = partResult[0];

  // Create production record
  const record = await sql`
    INSERT INTO production_records (part_id, operation_id, operator_id, quantity, expected_time_minutes, charged_value, status, start_time)
    VALUES (${part.id}, ${operation_id}, ${session.id}, ${quantity}, ${expected_time_minutes || null}, ${charged_value || 0}, 'EM_PRODUCAO', NOW())
    RETURNING *
  `;

  return NextResponse.json({ record: record[0], part });
}
