"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { registrarRespostas } from "@/domain/triagem/perfil";

export async function alterarModoConservador(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  await registrarRespostas(session.user.id, {
    modoConservadorManual: formData.get("modoConservador") === "on",
  });

  redirect("/mais/modo-conservador?sucesso=1");
}
