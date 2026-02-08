import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { action, charged_value } = await request.json();

  const sql = getDb();

  const existing = await sql`
    SELECT * FROM production_records WHERE id = ${parseInt(id)}
  `;

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Registro nao encontrado" },
      { status: 404 },
    );
  }

  const record = existing[0];

  if (action === "pause") {
    if (record.status !== "EM_PRODUCAO") {
      return NextResponse.json(
        { error: "So e possivel pausar producao em andamento" },
        { status: 400 },
      );
    }

    const updated = await sql`
      UPDATE production_records 
      SET status = 'PAUSADO', last_pause_start = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    return NextResponse.json({ record: updated[0] });
  }

  if (action === "resume") {
    if (record.status !== "PAUSADO") {
      return NextResponse.json(
        { error: "So e possivel retomar producao pausada" },
        { status: 400 },
      );
    }

    // Calculate pause duration and add to total
    const pauseDuration = record.last_pause_start
      ? Date.now() - new Date(record.last_pause_start as string).getTime()
      : 0;

    const updated = await sql`
      UPDATE production_records 
      SET status = 'EM_PRODUCAO', 
          total_pause_ms = COALESCE(total_pause_ms, 0) + ${pauseDuration},
          last_pause_start = NULL
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    return NextResponse.json({ record: updated[0] });
  }

  if (action === "finish") {
    if (record.status === "FINALIZADO") {
      return NextResponse.json(
        { error: "Producao ja finalizada" },
        { status: 400 },
      );
    }

    // If currently paused, add remaining pause time
    let extraPause = 0;
    if (
      record.status === "PAUSADO" &&
      record.last_pause_start
    ) {
      extraPause =
        Date.now() - new Date(record.last_pause_start as string).getTime();
    }

    const updated = await sql`
      UPDATE production_records 
      SET status = 'FINALIZADO', 
          end_time = NOW(),
          total_pause_ms = COALESCE(total_pause_ms, 0) + ${extraPause},
          last_pause_start = NULL,
          charged_value = CASE WHEN ${charged_value || 0} > 0 THEN ${charged_value || 0} ELSE charged_value END
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    return NextResponse.json({ record: updated[0] });
  }

  return NextResponse.json({ error: "Acao invalida" }, { status: 400 });
}
