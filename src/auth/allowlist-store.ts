import { db } from "@/db/client";
import { allowedEmails } from "@/db/schema";

/**
 * Fonte da allowlist para o callback de autorização. Isolado num
 * módulo próprio para poder ser substituído por um fake nos testes
 * do callback sem tocar o banco real.
 */
export async function getAllowlist(): Promise<string[]> {
  const rows = await db.select({ email: allowedEmails.email }).from(
    allowedEmails,
  );
  return rows.map((row) => row.email);
}
