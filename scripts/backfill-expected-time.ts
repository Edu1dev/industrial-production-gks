import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL is not set in .env file");
    process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function main() {
    console.log("Starting backfill of expected_time_minutes...");

    try {
        // 1. Fetch records that need update
        const recordsToUpdate = await sql`
      SELECT id, start_time, end_time, total_pause_ms, quantity
      FROM production_records
      WHERE status = 'FINALIZADO' 
        AND expected_time_minutes IS NULL
        AND end_time IS NOT NULL
        AND quantity > 0
    `;

        console.log(`Found ${recordsToUpdate.length} records to update.`);

        if (recordsToUpdate.length === 0) {
            console.log("No records to update.");
            return;
        }

        let updatedCount = 0;

        // 2. Update each record
        for (const record of recordsToUpdate) {
            const start = new Date(record.start_time).getTime();
            const end = new Date(record.end_time).getTime();
            const pause = Number(record.total_pause_ms || 0);

            // Calculate actual total duration in minutes
            const totalDurationMs = end - start - pause;
            const totalDurationMin = totalDurationMs / 60000;

            // We set expected_time_minutes to the ACTUAL total duration
            // This ensures the evaluation will be perfect/good (since actual == expected)
            // We use total duration (not per piece) because existing 'expected_time_minutes' 
            // is usually Total Expected Time for the batch (in the current logic it seems ambiguous 
            // but in the code it's treated as total time in some places and time-per-piece in others??)

            // Let's re-read part-search.tsx:
            // const actualMinutes = calculateProductionTime(record) / 60000;
            // const expectedMinutes = Number(record.expected_time_minutes);
            // if (actualMinutes < expectedMinutes * 0.9) ...

            // So expected_time_minutes is TOTAL expected time for the batch.

            // Ensure we don't set negative time
            const newExpectedTime = Math.max(0, totalDurationMin);

            await sql`
        UPDATE production_records
        SET expected_time_minutes = ${newExpectedTime}
        WHERE id = ${record.id}
      `;

            updatedCount++;
            if (updatedCount % 10 === 0) {
                console.log(`Updated ${updatedCount} records...`);
            }
        }

        console.log(`Successfully updated ${updatedCount} records.`);
    } catch (error) {
        console.error("Error running backfill:", error);
    }
}

main();
