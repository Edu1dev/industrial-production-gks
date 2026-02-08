import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const sql = getDb();
  const companies =
    await sql`SELECT id, name, created_at FROM companies ORDER BY name`;

  return NextResponse.json({ companies });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  if (!session.is_admin) {
    return NextResponse.json(
      { error: "Acesso negado: apenas administradores podem criar empresas" },
      { status: 403 }
    );
  }

  const { name } = await request.json();

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Nome da empresa e obrigatorio" },
      { status: 400 },
    );
  }

  const sql = getDb();

  try {
    const result = await sql`
      INSERT INTO companies (name)
      VALUES (${name.trim()})
      RETURNING id, name, created_at
    `;

    return NextResponse.json({ company: result[0] });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes("duplicate key")
    ) {
      return NextResponse.json(
        { error: "Ja existe uma empresa com esse nome" },
        { status: 409 },
      );
    }
    throw err;
  }
}
