import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session || !session.is_admin) {
        return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const operatorId = parseInt(id);

    if (isNaN(operatorId)) {
        return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Prevent deleting self
    if (operatorId === session.id) {
        return NextResponse.json(
            { error: "Voce nao pode excluir seu proprio usuario" },
            { status: 400 }
        );
    }

    const sql = getDb();

    try {
        // Check for production records
        const records = await sql`
      SELECT COUNT(*) as count FROM production_records WHERE operator_id = ${operatorId}
    `;

        if (parseInt(records[0].count) > 0) {
            return NextResponse.json(
                {
                    error:
                        "Este operador possui registros de producao e nao pode ser excluido. Inative-o se necessario.",
                },
                { status: 400 }
            );
        }

        // Delete operator
        await sql`DELETE FROM operators WHERE id = ${operatorId}`;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting operator:", error);
        return NextResponse.json(
            { error: "Erro ao excluir operador" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session || !session.is_admin) {
        return NextResponse.json({ error: "Nao autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const operatorId = parseInt(id);

    if (isNaN(operatorId)) {
        return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    try {
        const { password } = await request.json();

        if (!password || password.length < 4) {
            return NextResponse.json(
                { error: "Nova senha deve ter pelo menos 4 caracteres" },
                { status: 400 }
            );
        }

        const crypto = await import("node:crypto");
        const hash = crypto.createHash("sha256").update(password).digest("hex");

        const sql = getDb();

        await sql`
      UPDATE operators 
      SET password_hash = ${hash}
      WHERE id = ${operatorId}
    `;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating operator:", error);
        return NextResponse.json(
            { error: "Erro ao atualizar operador" },
            { status: 500 }
        );
    }
}
