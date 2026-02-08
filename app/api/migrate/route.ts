import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const sql = getDb();

    try {
        // Create production_groups table
        await sql`
      CREATE TABLE IF NOT EXISTS production_groups (
        id SERIAL PRIMARY KEY,
        part_code VARCHAR(100) NOT NULL,
        part_description TEXT,
        quantity INTEGER NOT NULL,
        company_id INTEGER REFERENCES companies(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        notes TEXT
      )
    `;

        // Add columns to production_records (these will fail if already exist, which is fine)
        try {
            await sql`ALTER TABLE production_records ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES production_groups(id) ON DELETE CASCADE`;
        } catch (e) {
            // Column might already exist
        }

        try {
            await sql`ALTER TABLE production_records ADD COLUMN IF NOT EXISTS operation_sequence INTEGER DEFAULT 1`;
        } catch (e) {
            // Column might already exist
        }

        // Create indexes
        await sql`CREATE INDEX IF NOT EXISTS idx_production_groups_part_code ON production_groups(part_code)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_production_groups_company_id ON production_groups(company_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_production_records_group_id ON production_records(group_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_production_records_group_sequence ON production_records(group_id, operation_sequence)`;

        return NextResponse.json({
            success: true,
            message: "Migration completed successfully"
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Migration failed" },
            { status: 500 }
        );
    }
}
