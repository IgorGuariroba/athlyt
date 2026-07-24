import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions } from "@/db/schema";

/**
 * Encerra a sessão em todos os dispositivos (specs/mvp-vertical.md,
 * user story 4) apagando todas as linhas de `session` do usuário —
 * o DrizzleAdapter só expõe deleteSession por token único, então essa
 * varredura por userId é responsabilidade do domínio, não do adapter.
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
