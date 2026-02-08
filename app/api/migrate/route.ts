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

        // Add columns to production_records
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

        // Create indexes for production_groups
        await sql`CREATE INDEX IF NOT EXISTS idx_production_groups_part_code ON production_groups(part_code)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_production_groups_company_id ON production_groups(company_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_production_records_group_id ON production_records(group_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_production_records_group_sequence ON production_records(group_id, operation_sequence)`;

        // === Projects migration ===

        // Create projects table
        await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        part_code VARCHAR(100) NOT NULL,
        company_id INTEGER NOT NULL REFERENCES companies(id),
        description TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        estimated_time_hours DECIMAL(10,2),
        charged_value_per_piece DECIMAL(12,2) NOT NULL DEFAULT 0,
        material_cost DECIMAL(12,2) DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE'
          CHECK (status IN ('PENDENTE','EM_PRODUCAO','FINALIZADO')),
        created_by INTEGER REFERENCES operators(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      )
    `;

        // Unique active project code (non-finalized)
        try {
            await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_active_code ON projects(UPPER(part_code)) WHERE status != 'FINALIZADO'`;
        } catch (e) {
            // Index might already exist
        }

        // Create pause_logs table
        await sql`
      CREATE TABLE IF NOT EXISTS pause_logs (
        id SERIAL PRIMARY KEY,
        production_record_id INTEGER NOT NULL REFERENCES production_records(id),
        reason TEXT NOT NULL,
        paused_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        resumed_at TIMESTAMP WITH TIME ZONE
      )
    `;

        // Add project_id column to production_records
        try {
            await sql`ALTER TABLE production_records ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id)`;
        } catch (e) {
            // Column might already exist
        }

        // Create indexes for projects
        await sql`CREATE INDEX IF NOT EXISTS idx_production_records_project_id ON production_records(project_id) WHERE project_id IS NOT NULL`;
        await sql`CREATE INDEX IF NOT EXISTS idx_pause_logs_record_id ON pause_logs(production_record_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`;

        return NextResponse.json({
            success: true,
            message: "Migration completed successfully (groups + projects)"
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Migration failed" },
            { status: 500 }
        );
    }
}
