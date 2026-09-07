import { auth } from "@/auth";
import type { UnidadeEstimada } from "@/domain/alimentos/prato";
import type { OrigemDecisao } from "@/domain/ia/decidir";
import { estimarMacrosDoAlimento } from "@/domain/ia/operacoes/alimento-macros";
import { campoTexto } from "@/lib/form-data";

/**
 * Recálculo de **um** item cujo alimento o atleta corrigiu na revisão.
 *
 * Mora fora das rotas porque foto e descrição fazem a mesma pergunta:
 * corrigir "Coca-Cola" para "Coca-Cola Zero" zera 105 kcal tanto num
 * fluxo quanto no outro. O que muda entre eles é só de onde a correção
 * partiu — e isso é a `origem` da Trilha de Decisão, parâmetro, não
 * constante.
 *
 * Não é um arquivo `"use server"`: cada rota exporta seu próprio
 * wrapper, e é o wrapper que declara a tela. Uma action única com a
 * origem fixa registraria o recálculo pela foto como se tivesse
 * nascido na tela de descrição, mentindo justo na auditoria.
 */

export interface MacrosRecalculados {
  calorias: number;
  proteinaG: number;
  carboidratosG: number;
  gordurasG: number;
  fibrasG: number;
  confianca: "alta" | "media" | "baixa";
  modelo: string;
}

export type ResultadoMacrosItem =
  | { ok: true; macros: MacrosRecalculados }
  | { ok: false; erro: string };

/**
 * Chamado por item e sob comando explícito do atleta, nunca durante a
 * digitação: renomear é tecla a tecla, e reestimar a cada tecla
 * gastaria uma chamada por letra e sobrescreveria em silêncio um
 * número que o próprio atleta talvez tenha ajustado à mão.
 *
 * Devolve proposta e não grava nada: o item só muda na tela, e o
 * registro continua dependendo da confirmação final.
 */
export async function recalcularMacrosDoItem(
  fd: FormData,
  origem: OrigemDecisao,
): Promise<ResultadoMacrosItem> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  const userId = session.user.id;

  const alimento = campoTexto(fd, "alimento").trim();
  if (alimento.length === 0 || alimento.length > 80) {
    return { ok: false, erro: "Escreva o nome do alimento para recalcular." };
  }

  // A unidade vem do item e é ecoada no erro: "1 a 3000 g" numa bebida
  // pediria ao atleta uma correção na unidade errada.
  const unidade: UnidadeEstimada = fd.get("unidade") === "ml" ? "ml" : "g";
  const quantidade = Number(campoTexto(fd, "quantidade").replace(",", "."));
  if (!Number.isFinite(quantidade) || quantidade <= 0 || quantidade > 3000) {
    return { ok: false, erro: `Quantidade fora do intervalo aceito (1 a 3000 ${unidade}).` };
  }

  const resultado = await estimarMacrosDoAlimento({
    userId,
    alimento,
    quantidade: Math.round(quantidade),
    unidade,
    origem,
  });

  if (resultado.status !== "ok") {
    return {
      ok: false,
      erro: "Não consegui recalcular agora. Os números continuam como estavam — tente de novo ou ajuste à mão.",
    };
  }

  return { ok: true, macros: { ...resultado.valor, modelo: resultado.modeloResolvido } };
}
