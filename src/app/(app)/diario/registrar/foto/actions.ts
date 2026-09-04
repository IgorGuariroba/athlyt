"use server";

import { auth } from "@/auth";
import {
  recalcularMacrosDoItem,
  type MacrosRecalculados,
  type ResultadoMacrosItem,
} from "../recalculo-de-item";
import {
  estimarRefeicao,
  type RefeicaoEstimadaNaTela,
  type ResultadoEstimativa,
} from "./servico";

export type {
  MacrosRecalculados,
  RefeicaoEstimadaNaTela,
  ResultadoEstimativa,
  ResultadoMacrosItem,
};

/** Compatibilidade para acréscimos por foto; o fluxo principal usa streaming HTTP. */
export async function estimarRefeicaoAction(fd: FormData): Promise<ResultadoEstimativa> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  return estimarRefeicao(fd, { userId: session.user.id });
}

export async function recalcularMacrosDoItemAction(fd: FormData): Promise<ResultadoMacrosItem> {
  return recalcularMacrosDoItem(fd, {
    tela: "Registrar por foto",
    rota: "/diario/registrar/foto",
    gatilho: "recalculo-de-macros-do-item",
  });
}
