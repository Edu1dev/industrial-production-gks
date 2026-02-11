import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("record_ids");

  if (!ids) {
    return NextResponse.json({ pauses: [] });
  }

  const recordIds = ids
    .split(",")
    .map((id) => parseInt(id.trim()))
    .filter((id) => !isNaN(id));

  if (recordIds.length === 0) {
    return NextResponse.json({ pauses: [] });
  }

  const sql = getDb();

  const pauses = await sql`
    SELECT
      pl.id,
      pl.production_record_id,
      pl.reason,
      pl.paused_at,
      pl.resumed_at,
      CASE WHEN pl.resumed_at IS NOT NULL THEN
        ROUND(EXTRACT(EPOCH FROM (pl.resumed_at - pl.paused_at)) / 60, 1)
      ELSE NULL END as duration_min
    FROM pause_logs pl
    WHERE pl.production_record_id = ANY(${recordIds})
    ORDER BY pl.paused_at ASC
  `;

  return NextResponse.json({ pauses });
}
