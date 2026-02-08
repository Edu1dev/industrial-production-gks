import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(
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

  // Find the last finalized operation for this project
  const lastOp = await sql`
    SELECT pr.* FROM production_records pr
    WHERE pr.project_id = ${parseInt(id)} AND pr.status = 'FINALIZADO'
    ORDER BY pr.end_time DESC
    LIMIT 1
  `;

  if (lastOp.length === 0) {
    return NextResponse.json({ error: "Nenhuma operacao finalizada para reverter" }, { status: 400 });
  }

  const record = lastOp[0];

  // Revert the production record to PAUSADO
  // Add the time between end_time and now to total_pause_ms so the timer preserves the original elapsed time
  await sql`
    UPDATE production_records
    SET status = 'PAUSADO',
        total_pause_ms = COALESCE(total_pause_ms, 0) + (EXTRACT(EPOCH FROM (NOW() - end_time)) * 1000)::bigint,
        end_time = NULL,
        last_pause_start = NOW()
    WHERE id = ${record.id}
  `;

  // If project was FINALIZADO, revert to PENDENTE
  if (existing[0].status === "FINALIZADO") {
    await sql`
      UPDATE projects
      SET status = 'PENDENTE', completed_at = NULL
      WHERE id = ${parseInt(id)}
    `;
  }

  return NextResponse.json({
    success: true,
    reverted_record_id: record.id,
    message: "Operacao revertida com sucesso",
  });
}
