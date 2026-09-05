import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { users, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revokeAllSessions } from "../sessions";

/**
 * Seam: a tabela `session` via Drizzle, contra um Postgres real de
 * desenvolvimento. Cobre o encerramento da sessão em todos os
 * dispositivos.
 */
describe("revokeAllSessions", () => {
  it("apaga todas as sessões do usuário e preserva sessões de outros usuários", async () => {
    const email = `sessions-test-${randomUUID()}@example.com`;
    const outroEmail = `sessions-test-outro-${randomUUID()}@example.com`;

    const [user] = await db.insert(users).values({ email }).returning();
    const [outroUser] = await db
      .insert(users)
      .values({ email: outroEmail })
      .returning();

    const expires = new Date(Date.now() + 1000 * 60 * 60);
    await db.insert(sessions).values([
      { sessionToken: randomUUID(), userId: user!.id, expires },
      { sessionToken: randomUUID(), userId: user!.id, expires },
      { sessionToken: randomUUID(), userId: outroUser!.id, expires },
    ]);

    await revokeAllSessions(user!.id);

    const restantesDoUsuario = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, user!.id));
    const restantesDoOutro = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, outroUser!.id));

    expect(restantesDoUsuario).toHaveLength(0);
    expect(restantesDoOutro).toHaveLength(1);
  });
});
