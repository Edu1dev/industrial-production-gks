import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Helper: Close open time record when pausing/finishing
async function closeTimeRecord(
  sql: ReturnType<typeof getDb>,
  operatorId: number,
  reason: string | null,
  reasonNotes?: string
) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Find open time record for this operator today
  const openRecords = await sql`
    SELECT id, clock_in FROM time_records 
    WHERE operator_id = ${operatorId} 
      AND record_date = ${today}
      AND clock_out IS NULL
    ORDER BY clock_in DESC
    LIMIT 1
  `;

  if (openRecords.length === 0) {
    return null; // No open record to close
  }

  const openRecord = openRecords[0];
  const clockIn = new Date(openRecord.clock_in).getTime();
  const clockOut = now.getTime();
  const workedMinutes = Math.round((clockOut - clockIn) / 60000);

  // Close the time record
  const result = await sql`
    UPDATE time_records
    SET clock_out = ${now.toISOString()},
        reason = ${reason},
        reason_notes = ${reasonNotes || null},
        worked_minutes = ${workedMinutes}
    WHERE id = ${openRecord.id}
    RETURNING *
  `;

  return result[0];
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { action, charged_value, reason, complete_project } = await request.json();

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

    // Create pause_log with reason if provided
    if (reason) {
      await sql`
        INSERT INTO pause_logs (production_record_id, reason, paused_at)
        VALUES (${parseInt(id)}, ${reason}, NOW())
      `;
    }

    // Close time record ONLY if reason is "Almoço" or "Fim do turno"
    const reasonsToCloseRecord = ["Almoço", "Fim do turno"];
    if (reason && reasonsToCloseRecord.includes(reason)) {
      try {
        await closeTimeRecord(sql, session.id, reason);
      } catch (e) {
        console.error("Failed to close time record:", e);
      }
    }

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

    // Update resumed_at on the last pause_log
    await sql`
      UPDATE pause_logs
      SET resumed_at = NOW()
      WHERE id = (
        SELECT id FROM pause_logs
        WHERE production_record_id = ${parseInt(id)} AND resumed_at IS NULL
        ORDER BY paused_at DESC
        LIMIT 1
      )
    `;

    // If operator has NO open time record (e.g. returning from Lunch), create one
    // But verify first if it corresponds to "Almoço" or "Fim do turno" return logic
    // Actually, just ensuring they have an open record is enough.
    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      // Check if there's already an open record
      const openRecords = await sql`
        SELECT id FROM time_records 
        WHERE operator_id = ${session.id} 
          AND record_date = ${today}
          AND clock_out IS NULL
        LIMIT 1
      `;

      if (openRecords.length === 0) {
        // Create new record (returning from break that closed the record)
        // Get part code from the production record
        const partData = await sql`
          SELECT p.code FROM production_records pr
          JOIN parts p ON pr.part_id = p.id
          WHERE pr.id = ${parseInt(id)}
        `;
        const partCode = partData[0]?.code || null;

        // Check if it's the very first record of the day to apply -5 min?
        // Logic: createClockInRecord applies -5 min. Here we are RESUMING.
        // Usually returning from lunch doesn't get -5 min.
        // We'll just use NOW().

        await sql`
          INSERT INTO time_records (operator_id, record_date, clock_in, part_code, production_record_id)
          VALUES (${session.id}, ${today}, ${now.toISOString()}, ${partCode}, ${parseInt(id)})
        `;
      }
    } catch (e) {
      console.error("Failed to create time record on resume:", e);
    }

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
          charged_value = CASE WHEN ${charged_value || 0}::numeric > 0 THEN ${charged_value || 0}::numeric ELSE charged_value END
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    // Handle project status changes
    if (record.project_id) {
      if (complete_project) {
        // Finalize the project
        await sql`
          UPDATE projects
          SET status = 'FINALIZADO', completed_at = NOW()
          WHERE id = ${record.project_id}
        `;
      } else {
        // Return project to PENDENTE for next operation
        await sql`
          UPDATE projects
          SET status = 'PENDENTE'
          WHERE id = ${record.project_id}
        `;
      }
    }

    // DO NOT close time record on finish. Operator continues to next piece.
    // unless they explicitly pause/stop.

    return NextResponse.json({ record: updated[0] });
  }

  return NextResponse.json({ error: "Acao invalida" }, { status: 400 });
}
