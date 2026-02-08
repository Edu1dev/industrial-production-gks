import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json(
        { error: "Login e senha sao obrigatorios" },
        { status: 400 },
      );
    }

    const sql = getDb();
    const rows =
      await sql`SELECT id, name, login, password_hash FROM operators WHERE login = ${login}`;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Operador nao encontrado" },
        { status: 401 },
      );
    }

    const operator = rows[0];

    // Simple password check - compare directly for seeded users, or use bcrypt-like comparison
    // For production, you'd use bcrypt. Here we do a simple hash comparison.
    const crypto = await import("node:crypto");
    const hash = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    if (operator.password_hash !== hash) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

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
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
