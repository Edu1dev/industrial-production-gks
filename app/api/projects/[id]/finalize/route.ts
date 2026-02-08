import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id);
    if (isNaN(projectId)) {
        return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const sql = getDb();

    try {
        // Check if project exists and is not already finalized
        const projects = await sql`
      SELECT status FROM projects WHERE id = ${projectId}
    `;

        if (projects.length === 0) {
            return NextResponse.json({ error: "Projeto nao encontrado" }, { status: 404 });
        }

        if (projects[0].status === "FINALIZADO") {
            return NextResponse.json({ error: "Projeto ja finalizado" }, { status: 400 });
        }

        // Check for active production records
        const activeRecords = await sql`
        SELECT COUNT(*) as count
        FROM production_records
        WHERE project_id = ${projectId} AND status = 'EM_PRODUCAO'
    `;

        if (parseInt(activeRecords[0].count) > 0) {
            return NextResponse.json({ error: "Existem producoes ativas neste projeto. Finalize-as antes de encerrar o projeto." }, { status: 400 });
        }

        // Calculate total real time (sum of all operations active duration)
        const totalTimeResult = await sql`
      SELECT SUM(
        EXTRACT(EPOCH FROM (end_time - start_time)) * 1000 - COALESCE(total_pause_ms, 0)
      ) as total_ms
      FROM production_records
      WHERE project_id = ${projectId}
        AND end_time IS NOT NULL
    `;

        const totalMs = parseFloat(totalTimeResult[0].total_ms || 0);
        const totalMinutes = Math.round(totalMs / 60000); // Convert to minutes

        // Mark project as finalized and save total time
        const updatedProject = await sql`
      UPDATE projects
      SET status = 'FINALIZADO', 
          completed_at = NOW(),
          real_time_minutes = ${totalMinutes}
      WHERE id = ${projectId}
      RETURNING *
    `;

        return NextResponse.json({ project: updatedProject[0] });
    } catch (error: any) {
        console.error("Finalize project error:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao finalizar projeto" },
            { status: 500 },
        );
    }
}
