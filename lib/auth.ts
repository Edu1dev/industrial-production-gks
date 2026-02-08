import { cookies } from "next/headers";
import { getDb } from "./db";

const SESSION_COOKIE = "protrack_session";

export interface Session {
  id: number;
  name: string;
  login: string;
  is_admin: boolean;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionValue) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(sessionValue, "base64").toString("utf-8"),
    );

    if (!parsed.id) return null;

    const sql = getDb();
    const rows = await sql`SELECT id, name, login, is_admin FROM operators WHERE id = ${parsed.id}`;

    if (rows.length === 0) return null;

    return {
      id: rows[0].id as number,
      name: rows[0].name as string,
      login: rows[0].login as string,
      is_admin: rows[0].is_admin as boolean || false,
    };
  } catch (err) {
    console.error("getSession error:", err);
    return null;
  }
}

export async function requireAdmin(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    throw new Error("Não autorizado");
  }

  if (!session.is_admin) {
    throw new Error("Acesso negado: apenas administradores");
  }

  return session;
}

export function createSessionToken(operator: {
  id: number;
  name: string;
  login: string;
}) {
  return Buffer.from(
    JSON.stringify({ id: operator.id, name: operator.name }),
  ).toString("base64");
}

export { SESSION_COOKIE };
