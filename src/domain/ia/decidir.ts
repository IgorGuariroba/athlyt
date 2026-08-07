import { generateText, Output, stepCountIs, type ToolSet } from "ai";
import type { z } from "zod";
import {
  montarContexto,
  renderizarContexto,
  type ContextoDoAtleta,
  type DadosRecorte,
} from "./contexto/montagem";
import type { NucleoContexto } from "./contexto/nucleo";
import type { OperacaoIA } from "./contexto/tipos";
import { observarOperacao } from "@/observabilidade/operacao";
import {
  modeloDe,
  NOME_PROVEDOR,
  openrouter,
  OPCOES_PROVEDOR,
} from "./provedor";
import {
  camposDoContexto,
  registrarDecisao,
  type ChamadaFerramenta,
} from "./trilha";

/**
 * Executor único de decisões de IA (ADR 0005 + ADR 0006).
 *
 * Toda operação passa por aqui, e é isso que torna as invariantes
 * mecânicas em vez de disciplina: o contexto é filtrado pela
 * declaração do recorte, a saída é validada por schema, e a Trilha de
 * Decisão é gravada em todos os caminhos — sucesso, degradação e
 * falha.
 *
 * Usa `generateText` com `Output.object` em vez de `generateObject`
 * porque só esse caminho admite Ferramentas de Leitura (ADR 0006):
 * `generateObject` é sempre um passo único, sem tool calling.
 */

export interface EntradaDecisao<T> {
  userId: string;
  operacao: OperacaoIA;
  nucleo: NucleoContexto;
  dados: DadosRecorte;
  consentimentos: readonly string[];
  instrucao: string;
  schema: z.ZodType<T>;
  ferramentas?: ToolSet;
  /** Imagens pertinentes à operação; só são aceitas quando o Recorte e o consentimento as declaram. */
  imagens?: readonly { dados: Uint8Array; mediaType: string }[];
  /** Teto de passos quando há Ferramentas de Leitura em jogo. */
  maxPassos?: number;
}

export type ResultadoDecisao<T> =
  | {
      status: "ok";
      valor: T;
      contexto: ContextoDoAtleta;
      modeloResolvido: string;
      /** Verdadeiro se algum campo sensível foi omitido por falta de consentimento. */
      degradado: boolean;
    }
  | {
      status: "indisponivel";
      contexto: ContextoDoAtleta;
      motivo: string;
    };

export async function decidir<T>(
  entrada: EntradaDecisao<T>,
): Promise<ResultadoDecisao<T>> {
  return observarOperacao(
    "ia.decisao",
    {
      "ia.operacao": entrada.operacao,
      "ia.modelo": modeloDe(entrada.operacao),
    },
    () => decidirInternamente(entrada),
  );
}

async function decidirInternamente<T>(
  entrada: EntradaDecisao<T>,
): Promise<ResultadoDecisao<T>> {
  const contexto = montarContexto({
    operacao: entrada.operacao,
    nucleo: entrada.nucleo,
    dados: entrada.dados,
    consentimentos: entrada.consentimentos,
  });

  const modeloSolicitado = modeloDe(entrada.operacao);
  const { camposEnviados, camposOmitidos } = camposDoContexto(contexto);
  const ferramentasConsultadas: ChamadaFerramenta[] = [];

  const base = {
    userId: entrada.userId,
    operacao: entrada.operacao,
    recorteVersao: contexto.recorteVersao,
    perfilVersao: contexto.nucleo.perfilVersao,
    modeloSolicitado,
    camposEnviados,
    camposOmitidos,
    degradado: contexto.degradado,
    ferramentasConsultadas,
  };

  try {
    if (entrada.imagens?.length && !("fotos-corporais" in contexto.recorte || "foto-refeicao" in contexto.recorte)) {
      throw new Error("Imagens omitidas por falta de consentimento para esta operação.");
    }
    const conteudo = renderizarContexto(contexto);
    const mensagem = entrada.imagens?.length
      ? { messages: [{ role: "user" as const, content: [{ type: "text" as const, text: conteudo }, ...entrada.imagens.map((imagem) => ({ type: "file" as const, data: imagem.dados, mediaType: imagem.mediaType }))] }] }
      : { prompt: conteudo };
    const resposta = await generateText({
      model: openrouter().chatModel(modeloSolicitado),
      output: Output.object({ schema: entrada.schema }),
      system: entrada.instrucao,
      ...mensagem,
      tools: entrada.ferramentas,
      stopWhen: stepCountIs(entrada.maxPassos ?? 5),
      providerOptions: OPCOES_PROVEDOR,
      onStepFinish: ({ toolCalls }) => {
        for (const chamada of toolCalls) {
          ferramentasConsultadas.push({
            nome: chamada.toolName,
            argumentos: chamada.input,
          });
        }
      },
    });

    // A auditoria exige o modelo efetivamente resolvido pelo
    // provedor, não o solicitado (ADR 0005).
    const modeloResolvido = resposta.response.modelId || null;

    await registrarDecisao({
      ...base,
      modeloResolvido,
      auditavel: modeloResolvido !== null,
      resultado: resposta.output,
    });

    // Sem modelo identificado não há como reproduzir a decisão; a ADR
    // 0005 manda degradar com segurança em vez de usar o resultado.
    if (modeloResolvido === null) {
      return {
        status: "indisponivel",
        contexto,
        motivo: "Resposta não auditável: provedor não identificou o modelo.",
      };
    }

    return {
      status: "ok",
      valor: resposta.output as T,
      contexto,
      modeloResolvido,
      degradado: contexto.degradado,
    };
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : String(erro);

    await registrarDecisao({
      ...base,
      modeloResolvido: null,
      auditavel: false,
      resultado: null,
      erro: motivo,
    });

    return { status: "indisponivel", contexto, motivo };
  }
}

export { NOME_PROVEDOR };
