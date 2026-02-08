import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const { next_operation_id, expected_time_minutes } = await request.json();

    if (!next_operation_id) {
        return NextResponse.json(
            { error: "next_operation_id é obrigatório" },
            { status: 400 }
        );
    }

    const sql = getDb();

    try {
        // Get current record
        const existing = await sql`
      SELECT pr.*, p.code as part_code, p.description as part_description, p.company_id
      FROM production_records pr
      JOIN parts p ON pr.part_id = p.id
      WHERE pr.id = ${parseInt(id)}
    `;

        if (existing.length === 0) {
            return NextResponse.json(
                { error: "Registro não encontrado" },
                { status: 404 }
            );
        }

        const record = existing[0];

        if (record.status === "FINALIZADO") {
            return NextResponse.json(
                { error: "Produção já finalizada" },
                { status: 400 }
            );
        }

        // Calculate extra pause if currently paused
        let extraPause = 0;
        if (record.status === "PAUSADO" && record.last_pause_start) {
            extraPause = Date.now() - new Date(record.last_pause_start as string).getTime();
        }

        // Finalize current record and get/create group
        let groupId = record.group_id;
        let nextSequence = (record.operation_sequence || 1) + 1;

        if (!groupId) {
            // Create new production group
            const group = await sql`
        INSERT INTO production_groups (part_code, part_description, quantity, company_id)
        VALUES (${record.part_code}, ${record.part_description || null}, ${record.quantity}, ${record.company_id || null})
        RETURNING id
      `;
            groupId = group[0].id;

            // Update current record with group_id
            await sql`
        UPDATE production_records
        SET group_id = ${groupId},
            operation_sequence = 1
        WHERE id = ${parseInt(id)}
      `;

            nextSequence = 2;
        }

        // Finalize current record
        await sql`
      UPDATE production_records
      SET status = 'FINALIZADO',
          end_time = NOW(),
          total_pause_ms = COALESCE(total_pause_ms, 0) + ${extraPause},
          last_pause_start = NULL
      WHERE id = ${parseInt(id)}
    `;

        // Create new record for next operation in PAUSADO status
        const newRecord = await sql`
      INSERT INTO production_records (
        part_id, operation_id, operator_id, quantity,
        status, start_time, last_pause_start, group_id, operation_sequence,
        charged_value, expected_time_minutes
      )
      VALUES (
        ${record.part_id}, ${parseInt(next_operation_id)}, ${session.id}, ${record.quantity},
        'PAUSADO', NOW(), NOW(), ${groupId}, ${nextSequence},
        0, ${expected_time_minutes || null}
      )
      RETURNING *
    `;

        // Get full record with joins
        const fullRecord = await sql`
      SELECT pr.*, p.code as part_code, p.description as part_description, p.material_cost,
             o.name as operation_name, o.machine_cost_per_hour,
             op.name as operator_name,
             c.name as company_name
      FROM production_records pr
      JOIN parts p ON pr.part_id = p.id
      JOIN operations o ON pr.operation_id = o.id
      JOIN operators op ON pr.operator_id = op.id
      LEFT JOIN companies c ON p.company_id = c.id
      WHERE pr.id = ${newRecord[0].id}
    `;

        return NextResponse.json({
            success: true,
            group_id: groupId,
            new_record: fullRecord[0],
            message: "Operação finalizada e próxima operação iniciada (pausada)"
        });
    } catch (error: any) {
        console.error("Continue operation error:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao continuar operação" },
            { status: 500 }
        );
    }
}
