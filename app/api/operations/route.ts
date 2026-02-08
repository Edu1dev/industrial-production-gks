import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const sql = getDb();
  const operations =
    await sql`SELECT id, name, machine_cost_per_hour FROM operations ORDER BY name`;
  return NextResponse.json({ operations });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { name, machine_cost_per_hour } = await request.json();
  if (!name) {
    return NextResponse.json(
      { error: "Nome da operacao e obrigatorio" },
      { status: 400 },
    );
  }

  const sql = getDb();
  const result = await sql`
    INSERT INTO operations (name, machine_cost_per_hour)
    VALUES (${name}, ${machine_cost_per_hour || 0})
    ON CONFLICT (name) DO UPDATE SET machine_cost_per_hour = COALESCE(${machine_cost_per_hour}, operations.machine_cost_per_hour)
    RETURNING id, name, machine_cost_per_hour
  `;

  return NextResponse.json({ operation: result[0] });
}
