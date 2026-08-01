"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { resolverConflito } from "@/domain/sessao/sincronizacao";

export async function resolverConflitoAction(conflitoId: string, escolha: "servidor" | "dispositivo") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sessão expirada.");
  await resolverConflito(session.user.id, conflitoId, escolha);
  revalidatePath("/mais/sincronizacao");
}
