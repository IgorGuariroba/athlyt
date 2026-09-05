import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { users, sessions, allowedEmails } from "@/db/schema";

/**
 * Simula uma sessão autenticada sem passar pelo OAuth real do Google —
 * inaceitável de automatizar em E2E. Insere usuário + sessão de banco
 * diretamente (mesmo shape que o DrizzleAdapter cria) e devolve o
 * cookie que o Auth.js espera (`authjs.session-token`, sem prefixo
 * __Secure- porque o dev server roda em HTTP).
 */
export async function seedAuthenticatedSession(email: string) {
  const [user] = await db
    .insert(users)
    .values({ email, name: email.split("@")[0] })
    .returning();
  if (!user) throw new Error("Falha ao criar usuário de teste.");

  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

  await db.insert(sessions).values({
    sessionToken,
    userId: user.id,
    expires,
  });

  return {
    user,
    cookie: {
      name: "authjs.session-token",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      expires: Math.floor(expires.getTime() / 1000),
      httpOnly: true,
      secure: false,
      sameSite: "Lax" as const,
    },
  };
}

export async function allowEmail(email: string) {
  await db.insert(allowedEmails).values({ email }).onConflictDoNothing();
}
