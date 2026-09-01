import {
  generateText,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
  stepCountIs,
  TypeValidationError,
  type ToolSet,
} from "ai";
import type { z } from "zod";
import {
  montarContexto,
  renderizarContexto,
  type ContextoDoAtleta,
  type DadosRecorte,
} from "./contexto/montagem";
import type { NucleoContexto } from "./contexto/nucleo";
import type { OperacaoIA } from "./contexto/tipos";
import { detalhesErroProvedor } from "./detalhes-erro-provedor";
import { detalhesErroGeracao } from "./detalhes-erro-geracao";
import { executarComTimeout } from "./timeout-geracao";
import { logger } from "@/observabilidade/logger";
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
  /** Áudios pertinentes à operação; mesma regra das imagens. */
  audios?: readonly { dados: Uint8Array; mediaType: string }[];
  /** Teto de passos quando há Ferramentas de Leitura em jogo. */
  maxPassos?: number;
  origem?: OrigemDecisao;
}

/**
 * De onde a decisão partiu, para a Trilha de Decisão.
 *
 * É um tipo nomeado porque há operação servindo mais de uma tela
 * (`alimento-macros` atende foto, texto e áudio): nesses casos a
 * origem é dado do chamador, e não constante da operação.
 */
export interface OrigemDecisao {
  tela: string;
  rota: string;
  gatilho: string;
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
      ...(entrada.origem ? {
        "ui.tela_origem": entrada.origem.tela,
        "ui.rota_origem": entrada.origem.rota,
        "ui.gatilho": entrada.origem.gatilho,
      } : {}),
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
    origemTela: entrada.origem?.tela,
    origemRota: entrada.origem?.rota,
    gatilho: entrada.origem?.gatilho,
    contextoEnviado: contexto,
    instrucaoSistema: entrada.instrucao,
  };

  try {
    if (entrada.imagens?.length && !("fotos-corporais" in contexto.recorte || "foto-refeicao" in contexto.recorte)) {
      throw new Error("Imagens omitidas por falta de consentimento para esta operação.");
    }
    if (entrada.audios?.length && !("audio-refeicao" in contexto.recorte)) {
      throw new Error("Áudios omitidos por falta de consentimento para esta operação.");
    }
    const conteudo = renderizarContexto(contexto);
    const registroBase = { ...base, promptEnviado: conteudo };
    // Imagem e áudio viajam pela mesma parte `file` do protocolo: o
    // que os distingue para o provedor é o `mediaType`, não a chave.
    const anexos = [...(entrada.imagens ?? []), ...(entrada.audios ?? [])];
    const mensagem = anexos.length
      ? { messages: [{ role: "user" as const, content: [{ type: "text" as const, text: conteudo }, ...anexos.map((anexo) => ({ type: "file" as const, data: anexo.dados, mediaType: anexo.mediaType }))] }] }
      : { prompt: conteudo };
    const gerar = (promptCorrecao?: string) => executarComTimeout((signal) => generateText({
      model: openrouter().chatModel(modeloSolicitado),
      abortSignal: signal,
      output: Output.object({ schema: entrada.schema }),
      system: entrada.instrucao,
      ...(promptCorrecao === undefined ? mensagem : { prompt: promptCorrecao }),
      tools: entrada.ferramentas,
      stopWhen: stepCountIs(entrada.maxPassos ?? 5),
      providerOptions: OPCOES_PROVEDOR,
      onStepFinish: ({ toolCalls, toolResults }) => {
        for (const [indice, chamada] of toolCalls.entries()) {
          const retorno = toolResults[indice];
          ferramentasConsultadas.push({
            nome: chamada.toolName,
            argumentos: chamada.input,
            resultado: retorno?.output,
          });
        }
      },
    }));

    let resposta;
    try {
      resposta = await gerar();
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      if (
        NoObjectGeneratedError.isInstance(erro)
        && /response did not match schema/i.test(motivo)
        && erro.text
      ) {
        const causaValidacao = TypeValidationError.isInstance(erro.cause)
          ? erro.cause.cause
          : erro.cause;
        const violacoes = causaValidacao instanceof Error
          ? causaValidacao.message
          : motivo;
        resposta = await gerar(`${conteudo}

A saída abaixo está quase correta, mas violou invariantes obrigatórias. Corrija somente as violações descritas e preserve todos os demais valores. Devolva novamente o objeto completo no schema solicitado.

VIOLAÇÕES:
${violacoes}

SAÍDA ANTERIOR:
${erro.text}`);
      } else if (NoOutputGeneratedError.isInstance(erro)) {
        // Resposta sem conteúdo algum — nem objeto inválido, nem JSON
        // quebrado: o provedor devolveu vazio. Diferente dos outros
        // dois ramos, aqui não há o que corrigir no prompt, porque não
        // veio texto nenhum de volta; a mesma pergunta feita de novo
        // costuma ser respondida.
        //
        // Observado em produção com `refeicao-texto`: a tela ficou em
        // "Estimando…" e terminou indisponível, enquanto a mesma
        // descrição respondia normalmente segundos depois. Sem este
        // ramo a falha transitória virava erro na cara do atleta, e o
        // custo de repetir é uma chamada.
        resposta = await gerar();
      } else {
        if (!/invalid json response/i.test(motivo)) throw erro;
        resposta = await gerar();
      }
    }

    // A auditoria exige o modelo efetivamente resolvido pelo
    // provedor, não o solicitado (ADR 0005).
    const modeloResolvido = resposta.response.modelId || null;

    await registrarDecisao({
      ...registroBase,
      modeloResolvido,
      auditavel: modeloResolvido !== null,
      resultado: resposta.output,
    });

    // Sem modelo identificado não há como reproduzir a decisão; a ADR
    // 0005 manda degradar com segurança em vez de usar o resultado.
    if (modeloResolvido === null) {
      const motivo = "Resposta não auditável: provedor não identificou o modelo.";
      logger.error(
        {
          operacao: entrada.operacao,
          modeloSolicitado,
          err: new Error(motivo),
        },
        "decisão de IA indisponível",
      );
      return { status: "indisponivel", contexto, motivo };
    }

    return {
      status: "ok",
      valor: resposta.output as T,
      contexto,
      modeloResolvido,
      degradado: contexto.degradado,
    };
  } catch (erro) {
    const motivo = erro instanceof Error && NoObjectGeneratedError.isInstance(erro)
      ? detalhesErroGeracao(erro)
      : detalhesErroProvedor(erro instanceof Error ? erro as Error & { statusCode?: number; responseBody?: string } : { message: String(erro) });

    logger.error(
      {
        operacao: entrada.operacao,
        modeloSolicitado,
        motivo,
        tipoErro: erro instanceof Error ? erro.constructor.name : typeof erro,
        err: erro instanceof Error ? erro : new Error(motivo),
      },
      "decisão de IA indisponível",
    );

    await registrarDecisao({
      ...base,
      promptEnviado: renderizarContexto(contexto),
      modeloResolvido: null,
      auditavel: false,
      resultado: null,
      erro: motivo,
    });

    return { status: "indisponivel", contexto, motivo };
  }
}

export { NOME_PROVEDOR };
