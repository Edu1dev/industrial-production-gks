import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { name, login, password } = await request.json();

    if (!name || !login || !password) {
      return NextResponse.json(
        { error: "Nome, login e senha sao obrigatorios" },
        { status: 400 },
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "Senha deve ter pelo menos 4 caracteres" },
        { status: 400 },
      );
    }

    const sql = getDb();

    // Check if login already exists
    const existing =
      await sql`SELECT id FROM operators WHERE login = ${login}`;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Login ja existe" },
        { status: 409 },
      );
    }

    const crypto = await import("node:crypto");
    const hash = crypto.createHash("sha256").update(password).digest("hex");

    const result = await sql`
      INSERT INTO operators (name, login, password_hash)
      VALUES (${name}, ${login}, ${hash})
      RETURNING id, name, login
    `;

    const operator = result[0];
    const token = createSessionToken({
      id: operator.id as number,
      name: operator.name as string,
      login: operator.login as string,
    });

    const response = NextResponse.json({
      success: true,
      operator: {
        id: operator.id,
        name: operator.name,
        login: operator.login,
      },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
