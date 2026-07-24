"use server";

import { signIn, signOut, auth } from "@/auth";
import { revokeAllSessions } from "@/domain/acesso/sessions";

/** Tela 001 — Boas-vindas: único ponto de entrada, via Google. */
export async function entrarComGoogle() {
  await signIn("google", { redirectTo: "/inicio" });
}

/** Encerra a sessão atual e volta à tela de boas-vindas. */
export async function sair() {
  await signOut({ redirectTo: "/" });
}

/**
 * Encerra a sessão em todos os dispositivos (user story 4): apaga
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
