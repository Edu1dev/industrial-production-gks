import { cookies } from "next/headers";
import { getDb } from "./db";

const SESSION_COOKIE = "protrack_session";

export async function getSession(): Promise<{
  id: number;
  name: string;
  login: string;
} | null> {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionValue) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(sessionValue, "base64").toString("utf-8"),
    );
    if (!parsed.id) return null;

    const sql = getDb();
    const rows =
      await sql`SELECT id, name, login FROM operators WHERE id = ${parsed.id}`;
    if (rows.length === 0) return null;

    return rows[0] as { id: number; name: string; login: string };
  } catch {
    return null;
  }
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
