"use server";

import { signIn, signOut, auth } from "@/auth";
import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { revokeAllSessions } from "@/domain/acesso/sessions";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

const DEV_SESSION_EMAIL = "dev@athlyt.local";

/** Entrada real via Google. */
export async function entrarComGoogle() {
  await signIn("google", { redirectTo: "/dieta" });
}

/** Login local exclusivo do ambiente de desenvolvimento. */
export async function entrarComoUsuarioDev() {
  if (process.env.NODE_ENV !== "development") redirect("/");

  const existente = await db.query.users.findFirst({
    where: eq(users.email, DEV_SESSION_EMAIL),
  });
  const [usuario] = existente
    ? [existente]
    : await db.insert(users).values({ email: DEV_SESSION_EMAIL, name: "Usuário de desenvolvimento" }).returning();

  const sessionToken = randomUUID();
  await db.insert(sessions).values({
    sessionToken,
    userId: usuario.id,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  const jar = await cookies();
  jar.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  redirect("/dieta");
}

/** Encerra a sessão atual e volta à tela de boas-vindas. */
export async function sair() {
  await signOut({ redirectTo: "/" });
}

/**
 * Encerra a sessão em todos os dispositivos: apaga
 * toda linha de `session` do usuário, não só a do dispositivo atual,
 * e então também desloga o dispositivo atual.
 */
export async function sairDeTodosDispositivos() {
  const session = await auth();
  if (session?.user?.id) {
    await revokeAllSessions(session.user.id);
  }
  await signOut({ redirectTo: "/" });
}
