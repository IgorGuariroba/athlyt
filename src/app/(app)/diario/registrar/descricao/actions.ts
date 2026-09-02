"use server";

import { revalidatePath } from "next/cache";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { auth } from "@/auth";
import {
  LIMITE_AUDIO_REFEICAO_BYTES,
  precisaConverterAudio,
  TIPO_AUDIO_CONVERTIDO,
  validarAudioRefeicao,
  validarDescricaoRefeicao,
} from "@/domain/alimentos/audio-refeicao";
import {
  itemEstimado,
  type ItemPrato,
  type OrigemEstimativa,
} from "@/domain/alimentos/prato";
import { reconstruirItemParaRegistro } from "../item-para-registro";
import {
  recalcularMacrosDoItem,
  type MacrosRecalculados,
  type ResultadoMacrosItem,
} from "../recalculo-de-item";
import { FUSO_PADRAO } from "@/domain/diario/dia-alimentar";
import {
  hojeDoUsuario,
  montarDiarioDoDia,
  registrarConsumoReal,
} from "@/domain/diario/repositorio";
import { conceder } from "@/domain/ia/consentimento";
import { montarNucleo } from "@/domain/ia/contexto/nucleo";
import { transcreverAudioDaRefeicao } from "@/domain/ia/operacoes/refeicao-audio";
import { estimarRefeicaoPorDescricao } from "@/domain/ia/operacoes/refeicao-texto";
import { NOME_PROVEDOR } from "@/domain/ia/provedor";
import { obterPerfilVigente } from "@/domain/triagem/perfil";

export interface RefeicaoDescritaNaTela {
  nome: string;
  itens: ItemPrato[];
  /** Porção como o atleta a descreveu, por item — o que ele reconhece ao revisar. */
  porcoesDescritas: string[];
  limitacoes: string[];
  confianca: "alta" | "media" | "baixa";
  descricaoUsada: string;
  origem: "texto" | "audio";
}

export type ResultadoDescricao =
  | { ok: true; estimativa: RefeicaoDescritaNaTela }
  | { ok: false; erro: string };

export type ResultadoTranscricao =
  | { ok: true; transcricao: string; trechosIncertos: string[] }
  | { ok: false; erro: string };

const execFileAsync = promisify(execFile);

/**
 * Transcodifica a gravação para o único formato que atravessa o
 * cliente do provedor (ver `TIPOS_AUDIO_PROVEDOR`).
 *
 * O FFmpeg detecta o container pelo conteúdo, então a mesma chamada
 * serve para o WebM do Chrome e o MP4 do Safari; a extensão de entrada
 * não é declarada de propósito, para não mentir sobre o que chegou.
 * Mono e 32 kbit/s porque o destino é reconhecimento de fala, e isso
 * mantém um minuto de áudio na casa das centenas de KB.
 */
async function converterAudioParaProvedor(bytes: Uint8Array) {
  const pasta = await mkdtemp(join(tmpdir(), "athlyt-audio-"));
  const entrada = join(pasta, "entrada");
  const saida = join(pasta, "saida.mp3");
  try {
    await writeFile(entrada, bytes);
    await execFileAsync(
      "ffmpeg",
      ["-y", "-i", entrada, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "32k", saida],
      { timeout: 30_000 },
    );
    return { bytes: new Uint8Array(await readFile(saida)), contentType: TIPO_AUDIO_CONVERTIDO };
  } finally {
    await rm(pasta, { recursive: true, force: true });
  }
}

async function contextoDoAtleta(userId: string) {
  const perfil = await obterPerfilVigente(userId);
  return montarNucleo({
    perfilVersao: perfil?.version ?? 0,
    respostas: perfil?.respostas ?? {},
    respondidoEm: perfil?.createdAt ?? new Date(),
    agora: new Date(),
  });
}

/**
 * Transcreve o áudio e devolve o texto **sem estimar nada**.
 *
 * O reconhecimento de fala erra palavras, e uma palavra errada vira
 * macro errado. Separar transcrever
 * de estimar dá ao atleta a chance de corrigir a frase enquanto ela
 * ainda é frase.
 *
 * Os bytes do áudio são efêmeros: vivem no corpo da requisição, vão ao
 * provedor e são descartados. Por isso o consentimento é do envio, não
 * de armazenamento.
 */
export async function transcreverAudioAction(fd: FormData): Promise<ResultadoTranscricao> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  const userId = session.user.id;

  const arquivo = fd.get("audio");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: "Grave um áudio descrevendo o que você comeu." };
  }
  if (arquivo.size > LIMITE_AUDIO_REFEICAO_BYTES) {
    return { ok: false, erro: "Áudio muito longo. Grave uma descrição mais curta." };
  }

  let audio;
  try {
    // Validar antes de converter mantém barato o caso ruim: um arquivo
    // que não é áudio nunca chega a ligar o FFmpeg.
    const recebido = validarAudioRefeicao({
      bytes: new Uint8Array(await arquivo.arrayBuffer()),
      contentType: arquivo.type,
    });
    audio = precisaConverterAudio(recebido.mediaType)
      ? validarAudioRefeicao(await converterAudioParaProvedor(recebido.dados))
      : recebido;
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Áudio inválido." };
  }

  const nucleo = await contextoDoAtleta(userId);

  await conceder(userId, "refeicao-audio", ["audio-refeicao"], NOME_PROVEDOR);

  const resultado = await transcreverAudioDaRefeicao({ userId, nucleo, audio });
  if (resultado.status !== "ok") {
    return {
      ok: false,
      erro: "Não consegui transcrever o áudio agora. Tente gravar de novo ou escreva a descrição.",
    };
  }

  return {
    ok: true,
    transcricao: resultado.valor.transcricao,
    trechosIncertos: resultado.valor.trechosIncertos,
  };
}

const CAMPOS_TEXTO = ["descricao-livre", "metas-restantes", "restricoes"];

/**
 * Estima a refeição a partir da descrição e devolve o resultado **sem
 * gravar nada**.
 *
 * Mesma separação do registro por foto: a IA propõe, o atleta
 * confirma. Falhar aqui não custa a descrição digitada — ela continua
 * na tela, porque nada dela vive no servidor.
 */
export async function estimarPorDescricaoAction(fd: FormData): Promise<ResultadoDescricao> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  const userId = session.user.id;

  let descricao: string;
  try {
    descricao = validarDescricaoRefeicao(String(fd.get("descricao") ?? ""));
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Descrição inválida." };
  }

  const origem = fd.get("origem") === "audio" ? "audio" : "texto";
  const fuso = FUSO_PADRAO;
  const dia = String(fd.get("dia") ?? "") || hojeDoUsuario(fuso);

  const nucleo = await contextoDoAtleta(userId);
  const diario = await montarDiarioDoDia(userId, { dia, fuso });

  await conceder(userId, "refeicao-texto", CAMPOS_TEXTO, NOME_PROVEDOR);

  const resultado = await estimarRefeicaoPorDescricao({
    userId,
    nucleo,
    descricao,
    origemDescricao: origem,
    metasRestantes: diario.painel.restante,
    restricoes: nucleo.restricoesAlimentares?.valor,
  });

  if (resultado.status !== "ok") {
    return {
      ok: false,
      erro: "A estimativa está indisponível agora. Sua descrição continua aqui — tente de novo em instantes.",
    };
  }

  return {
    ok: true,
    estimativa: {
      nome: resultado.valor.nome,
      itens: resultado.valor.itens.map((item) =>
        itemEstimado({
          ...item,
          modelo: resultado.modeloResolvido,
          origemEstimativa: origem,
        }),
      ),
      porcoesDescritas: resultado.valor.itens.map((item) => item.porcaoDescrita),
      limitacoes: resultado.valor.limitacoes,
      confianca: resultado.valor.confianca,
      descricaoUsada: descricao,
      origem,
    },
  };
}

export type { MacrosRecalculados, ResultadoMacrosItem };

/**
 * Recalcula energia e macros de **um** alimento corrigido na revisão.
 *
 * A lógica é compartilhada com a tela de foto; o que esta action
 * acrescenta é a tela de origem, que entra na Trilha de Decisão.
 */
export async function recalcularMacrosDoItemAction(fd: FormData): Promise<ResultadoMacrosItem> {
  return recalcularMacrosDoItem(fd, {
    tela: "Registrar por descrição",
    rota: "/diario/registrar/descricao",
    gatilho: "recalculo-de-macros-do-item",
  });
}

export type ResultadoRegistro = { ok: true } | { ok: false; erro: string };

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Grava o Consumo Real revisado pelo atleta.
 *
 * Os itens chegam serializados porque a revisão acontece no cliente, e
 * o servidor não confia neles. Cada item é reconstruído conforme sua
 * origem: dado de base é recalculado pela própria base; estimativa e
 * entrada do usuário preservam a proveniência que já carregavam. Um
 * payload adulterado não promove palpite a tabela nem infla macros
 * fora das faixas aceitas.
 */
export async function registrarConsumoRealAction(fd: FormData): Promise<ResultadoRegistro> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  const userId = session.user.id;

  const fuso = FUSO_PADRAO;
  const dia = String(fd.get("dia") ?? "") || hojeDoUsuario(fuso);
  const hora = String(fd.get("hora") ?? "");
  if (!HORA.test(hora)) {
    return { ok: false, erro: "Informe o horário da refeição no formato HH:MM." };
  }
  const nome = String(fd.get("nome") ?? "").trim();
  if (nome.length === 0 || nome.length > 60) {
    return { ok: false, erro: "Dê à refeição um nome de até 60 caracteres." };
  }

  const refeicaoRef = String(fd.get("refeicaoRef") ?? "").trim() || null;
  const consumoId = String(fd.get("consumoId") ?? "").trim() || null;
  const origem = (fd.get("origem") === "audio" ? "audio" : "texto") as OrigemEstimativa;

  let bruto: unknown;
  try {
    bruto = JSON.parse(String(fd.get("itens") ?? "[]"));
  } catch {
    return { ok: false, erro: "Não consegui ler os itens revisados. Refaça a estimativa." };
  }
  if (!Array.isArray(bruto) || bruto.length === 0) {
    return { ok: false, erro: "Um registro precisa de ao menos um item." };
  }

  let itens: ItemPrato[];
  try {
    itens = (bruto as ItemPrato[]).map((item) =>
      reconstruirItemParaRegistro(item, origem),
    );
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Itens inválidos." };
  }

  await registrarConsumoReal(userId, {
    consumoId,
    refeicaoRef,
    nome,
    itens,
    dia,
    horaLocal: hora,
    fuso,
  });

  revalidatePath("/diario");
  revalidatePath("/dieta");
  revalidatePath("/treino");

  return { ok: true };
}
