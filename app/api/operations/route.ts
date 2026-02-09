import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

const MACHINE_COST_FACTOR = 1.667;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const sql = getDb();
  const operations =
    await sql`SELECT id, name, ROUND(machine_cost_per_hour / 1.667, 2) as base_cost_per_hour, machine_cost_per_hour FROM operations ORDER BY name`;
  return NextResponse.json({ operations });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  if (!session.is_admin) {
    return NextResponse.json(
      { error: "Acesso negado: apenas administradores podem alterar operações" },
      { status: 403 }
    );
  }

  const { id, base_cost_per_hour } = await request.json();
  if (!id || base_cost_per_hour == null) {
    return NextResponse.json(
      { error: "ID e custo base por hora sao obrigatorios" },
      { status: 400 },
    );
  }

  const machineCost = Math.round(Number(base_cost_per_hour) * MACHINE_COST_FACTOR * 100) / 100;

  const sql = getDb();
  const result = await sql`
    UPDATE operations
    SET machine_cost_per_hour = ${machineCost}
    WHERE id = ${id}
    RETURNING id, name, ROUND(machine_cost_per_hour / 1.667, 2) as base_cost_per_hour, machine_cost_per_hour
  `;

  if (result.length === 0) {
    return NextResponse.json(
      { error: "Operacao nao encontrada" },
      { status: 404 },
    );
  }

  return NextResponse.json({ operation: result[0] });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  if (!session.is_admin) {
    return NextResponse.json(
      { error: "Acesso negado: apenas administradores podem criar operações" },
      { status: 403 }
    );
  }

  const { name, base_cost_per_hour } = await request.json();
  if (!name) {
    return NextResponse.json(
      { error: "Nome da operacao e obrigatorio" },
      { status: 400 },
    );
  }

  const baseCost = Number(base_cost_per_hour) || 0;
  const machineCost = Math.round(baseCost * MACHINE_COST_FACTOR * 100) / 100;

  const sql = getDb();
  const result = await sql`
    INSERT INTO operations (name, machine_cost_per_hour)
    VALUES (${name}, ${machineCost})
    ON CONFLICT (name) DO UPDATE SET
      machine_cost_per_hour = ${machineCost}
    RETURNING id, name, ROUND(machine_cost_per_hour / 1.667, 2) as base_cost_per_hour, machine_cost_per_hour
  `;

  return NextResponse.json({ operation: result[0] });
}
