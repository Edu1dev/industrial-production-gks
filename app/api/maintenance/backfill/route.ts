import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
    const sql = getDb();

    try {
        const recordsToUpdate = await sql`
      SELECT id, start_time, end_time, total_pause_ms, quantity
      FROM production_records
      WHERE status = 'FINALIZADO' 
        AND expected_time_minutes IS NULL 
        AND end_time IS NOT NULL 
        AND quantity > 0
    `;

        let updatedCount = 0;

        for (const record of recordsToUpdate) {
            const start = new Date(record.start_time).getTime();
            const end = new Date(record.end_time).getTime();
            const pause = Number(record.total_pause_ms || 0);

            const totalDurationMs = end - start - pause;
            const totalDurationMin = Math.max(0, totalDurationMs / 60000);

            await sql`
        UPDATE production_records
        SET expected_time_minutes = ${totalDurationMin}
        WHERE id = ${record.id}
      `;
            updatedCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Updated ${updatedCount} records`,
            totalFound: recordsToUpdate.length
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
