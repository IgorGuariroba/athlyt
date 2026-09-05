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
import { estadoConsentimento } from "./consentimento";
import {
  modeloDe,
  NOME_PROVEDOR,
  openrouter,
  OPCOES_PROVEDOR,
  opcoesDaRota,
} from "./provedor";
import {
  executarFallbackDeModelo,
  type EventoProgressoFallback,
  type RotaModeloAprovada,
  type ResultadoChamadaRota,
} from "./fallback-modelo";
import {
  camposDoContexto,
  registrarDecisao,
  type ChamadaFerramenta,
} from "./trilha";

/**
 * Executor único de decisões de IA.
 *
 * Toda operação passa por aqui, e é isso que torna as invariantes
 * mecânicas em vez de disciplina: o contexto é filtrado pela
 * declaração do recorte, a saída é validada por schema, e a Trilha de
 * Decisão é gravada em todos os caminhos — sucesso, degradação e
 * falha.
 *
 * Usa `generateText` com `Output.object` em vez de `generateObject`
 * porque só esse caminho admite Ferramentas de Leitura:
 * `generateObject` é sempre um passo único, sem tool calling.
 */

export interface EntradaDecisao<T> {
  userId: string;
  operacao: OperacaoIA;
  nucleo: NucleoContexto;
  dados: DadosRecorte;
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
  /** Cadeia fixa usada somente por operações que aprovaram fallback controlado. */
  rotas?: readonly RotaModeloAprovada[];
  signal?: AbortSignal;
  aoProgresso?: (evento: EventoProgressoFallback) => void;
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

function montarPromptCorrecao(contexto: string, erro: unknown): string {
  const texto = NoObjectGeneratedError.isInstance(erro) ? erro.text : undefined;
  return `${contexto}\n\nA saída anterior não respeitou o JSON Schema. Corrija somente as violações e devolva o objeto completo.${texto ? `\n\nSAÍDA ANTERIOR:\n${texto}` : ""}`;
}

function metadadosTecnicosDoErro(erro: unknown, profundidade = 0, vistos = new WeakSet<object>()): { status: number; codigo: string } {
  if (!erro || typeof erro !== "object" || profundidade > 4 || vistos.has(erro)) return { status: 0, codigo: "" };
  vistos.add(erro);
  const registro = erro as Record<string, unknown>;
  const status = Number(registro.statusCode ?? registro.status ?? 0);
  const codigo = String(registro.code ?? "");
  if (status || codigo) return { status, codigo };
  // `Array.isArray` afina `unknown` para `any[]`: sem este recast o spread
  // reinfetaria `any` no array de filhos e a recursão perderia o tipo.
  const errosAgregados = Array.isArray(registro.errors) ? (registro.errors as unknown[]) : [];
  for (const filho of [registro.cause, registro.lastError, ...errosAgregados]) {
    const encontrado = metadadosTecnicosDoErro(filho, profundidade + 1, vistos);
    if (encontrado.status || encontrado.codigo) return encontrado;
  }
  return { status: 0, codigo: "" };
}

function classificarFalhaDeModelo<T>(erro: unknown): ResultadoChamadaRota<T> {
  const { status, codigo } = metadadosTecnicosDoErro(erro);
  const mensagem = erro instanceof Error ? erro.message : String(erro);

  if (NoOutputGeneratedError.isInstance(erro)) {
    return { tipo: "resposta-vazia", motivo: "Resposta vazia do fornecedor.", retryable: true };
  }
  if (NoObjectGeneratedError.isInstance(erro) || /invalid json response/i.test(mensagem)) {
    return { tipo: "saida-invalida", motivo: "Saída inválida do modelo." };
  }
  if (status === 429 || /(?:http\s*)?429|rate[ -]?limit|too many requests/i.test(mensagem)) {
    return { tipo: "limite-taxa", motivo: "Limite de taxa.", retryable: true };
  }
  if (status >= 500 && status <= 599) {
    return { tipo: "indisponibilidade-externa", motivo: "Fornecedor indisponível.", retryable: true };
  }
  if (/timeout/i.test(mensagem)) return { tipo: "timeout", motivo: "Tempo da rota esgotado.", retryable: true };
  if (["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"].includes(codigo)) {
    return { tipo: "indisponibilidade-externa", motivo: "Falha transitória de rede.", retryable: true };
  }
  return { tipo: "erro", motivo: "Erro inesperado na rota." };
}

export type ResultadoDecisao<T> =
  | {
      status: "ok";
      valor: T;
      contexto: ContextoDoAtleta;
      modeloResolvido: string;
      /** Verdadeiro se algum campo sensível foi omitido por falta de consentimento. */
      degradado: boolean;
      tentativasModelo?: import("./fallback-modelo").TentativaModelo[];
    }
  | {
      status: "indisponivel";
      contexto: ContextoDoAtleta;
      motivo: string;
      tentativasModelo?: import("./fallback-modelo").TentativaModelo[];
      cancelada?: boolean;
      erroInesperado?: boolean;
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
  // Consentimento é um fato persistido, não uma afirmação do adapter.
  // Consultá-lo aqui garante que revogação e versão do Recorte valham para
  // toda operação que atravessa este executor.
  const estado = await estadoConsentimento(entrada.userId, entrada.operacao);
  const contexto = montarContexto({
    operacao: entrada.operacao,
    nucleo: entrada.nucleo,
    dados: entrada.dados,
    consentimentos: estado.vigentes,
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
    if (entrada.imagens?.length && contexto.camposOmitidos.some((campo) => campo === "fotos-corporais" || campo === "foto-refeicao")) {
      throw new Error("Imagens omitidas por falta de consentimento para esta operação.");
    }
    if (entrada.audios?.length && contexto.camposOmitidos.includes("audio-refeicao")) {
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
    const gerar = (
      promptCorrecao?: string,
      rota?: RotaModeloAprovada,
      signalExterno?: AbortSignal,
    ) => executarComTimeout((signal) => generateText({
      model: openrouter().chatModel(rota?.modelo ?? modeloSolicitado),
      abortSignal: signal,
      output: Output.object({ schema: entrada.schema }),
      system: entrada.instrucao,
      ...(promptCorrecao === undefined ? mensagem : { prompt: promptCorrecao }),
      tools: entrada.ferramentas,
      stopWhen: stepCountIs(entrada.maxPassos ?? 5),
      ...(rota ? { maxOutputTokens: 4_096 } : {}),
      providerOptions: rota ? opcoesDaRota(rota) : OPCOES_PROVEDOR,
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
    }), rota ? 360_000 : undefined, signalExterno);

    if (entrada.rotas?.length) {
      if (entrada.signal?.aborted) {
        return { status: "indisponivel", contexto, motivo: "Estimativa cancelada.", cancelada: true, tentativasModelo: [] };
      }
      const correcoes = new Map<string, string>();
      const fallback = await executarFallbackDeModelo({
        rotas: entrada.rotas,
        signal: entrada.signal,
        aoProgresso: entrada.aoProgresso,
        executar: async (rota, { chamada, signal }): Promise<ResultadoChamadaRota<T>> => {
          try {
            const respostaRota = await gerar(correcoes.get(rota.modelo), rota, signal);
            const modeloResolvido = respostaRota.response.modelId || "";
            if (modeloResolvido !== rota.modelo) {
              return { tipo: "erro", motivo: "Modelo resolvido fora da rota aprovada." };
            }
            return { tipo: "sucesso", valor: respostaRota.output as T, modeloResolvido };
          } catch (erro) {
            if (entrada.signal?.aborted || (erro instanceof Error && erro.name === "AbortError")) throw erro;
            const falha = classificarFalhaDeModelo<T>(erro);
            if (falha.tipo === "saida-invalida" && chamada === 1) {
              correcoes.set(rota.modelo, montarPromptCorrecao(conteudo, erro));
              return { ...falha, retryable: true };
            }
            return falha;
          }
        },
      });

      const resultadoFallback = fallback.status === "ok" ? fallback.valor : null;
      for (const tentativa of fallback.tentativas.filter((item) => item.desfecho !== "ok")) {
        logger.warn({
          categoria: tentativa.desfecho,
          operacao: entrada.operacao,
          rotaSolicitada: `${tentativa.rota.modelo}@${tentativa.rota.endpoint}`,
          chamadas: tentativa.chamadas,
          esgotada: tentativa.chamadas >= 2 || tentativa.desfecho === "timeout",
        }, "tentativa de modelo encerrada");
      }
      await registrarDecisao({
        ...registroBase,
        modeloSolicitado: entrada.rotas[0].modelo,
        modeloResolvido: fallback.status === "ok" ? fallback.modeloResolvido : null,
        auditavel: fallback.status === "ok",
        resultado: resultadoFallback,
        erro: fallback.status === "cancelada" ? "cancelada-pelo-atleta" : fallback.status === "ok" ? undefined : fallback.motivo,
        rotasConfiguradas: entrada.rotas,
        tentativasModelo: fallback.tentativas,
        desfecho: fallback.status === "ok" ? "ok" : fallback.status === "cancelada" ? "cancelada" : fallback.status === "erro" ? "erro" : "indisponivel",
      });

      if (fallback.status === "ok") {
        return {
          status: "ok",
          valor: fallback.valor,
          contexto,
          modeloResolvido: fallback.modeloResolvido,
          degradado: contexto.degradado,
          tentativasModelo: fallback.tentativas,
        };
      }
      return {
        status: "indisponivel",
        contexto,
        motivo: fallback.status === "cancelada" ? "Estimativa cancelada." : fallback.motivo,
        tentativasModelo: fallback.tentativas,
        cancelada: fallback.status === "cancelada",
        erroInesperado: fallback.status === "erro",
      };
    }

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
    // provedor, não o solicitado.
    const modeloResolvido = resposta.response.modelId || null;

    await registrarDecisao({
      ...registroBase,
      modeloResolvido,
      auditavel: modeloResolvido !== null,
      resultado: resposta.output,
    });

    // Sem modelo identificado não há como reproduzir a decisão; nesse
    // caso, degrade com segurança em vez de usar o resultado.
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

    const falha = classificarFalhaDeModelo<T>(erro);
    const statusHttp = metadadosTecnicosDoErro(erro).status || undefined;
    logger.error(
      {
        categoria: falha.tipo,
        operacao: entrada.operacao,
        rotaSolicitada: modeloSolicitado,
        statusHttp,
        chamadas: 1,
        esgotada: true,
        err: erro instanceof Error ? erro : new Error("Falha da decisão de IA."),
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
