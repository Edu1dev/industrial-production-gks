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
  console.log("[v0] getSession - cookie value exists:", !!sessionValue);
  if (!sessionValue) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(sessionValue, "base64").toString("utf-8"),
    );
    console.log("[v0] getSession - parsed token:", JSON.stringify(parsed));
    if (!parsed.id) return null;

    const sql = getDb();
    const rows =
      await sql`SELECT id, name, login FROM operators WHERE id = ${parsed.id}`;
    console.log("[v0] getSession - db rows found:", rows.length);
    if (rows.length === 0) return null;

    return rows[0] as { id: number; name: string; login: string };
  } catch (err) {
    console.error("[v0] getSession error:", err);
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
