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
  validarAudioRefeicao,
  validarDescricaoRefeicao,
} from "@/domain/alimentos/audio-refeicao";
import { itemEstimado, type ItemPrato, type OrigemEstimativa } from "@/domain/alimentos/prato";
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

async function converterAudioParaOgg(bytes: Uint8Array) {
  const pasta = await mkdtemp(join(tmpdir(), "athlyt-audio-"));
  const entrada = join(pasta, "entrada.mp4");
  const saida = join(pasta, "saida.ogg");
  try {
    await writeFile(entrada, bytes);
    await execFileAsync("ffmpeg", ["-y", "-i", entrada, "-vn", "-ac", "1", "-c:a", "libopus", "-b:a", "32k", saida], { timeout: 30_000 });
    return { bytes: new Uint8Array(await readFile(saida)), contentType: "audio/ogg" };
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
 * A parada aqui é a decisão da ADR 0002: reconhecimento de fala erra
 * palavras, e uma palavra errada vira macro errado. Separar transcrever
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
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    const convertido = arquivo.type.split(";")[0].trim().toLowerCase() === "audio/mp4"
      ? await converterAudioParaOgg(bytes)
      : { bytes, contentType: arquivo.type };
    audio = validarAudioRefeicao({
      bytes: convertido.bytes,
      contentType: convertido.contentType,
    });
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
 * na tela, porque nada dela vive no servidor (user story 32).
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

export type ResultadoRegistro = { ok: true } | { ok: false; erro: string };

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Grava o Consumo Real revisado pelo atleta.
 *
 * Os itens chegam serializados porque a revisão acontece no cliente, e
 * o servidor não confia neles: cada item é reconstruído por
 * `itemEstimado`, que recalcula descrição, arredondamento e
 * proveniência. Um payload adulterado não consegue gravar uma
 * estimativa como se fosse valor de tabela, nem inflar macros fora das
 * faixas do schema.
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
  if (dia > hojeDoUsuario(fuso)) {
    return { ok: false, erro: "Não dá para registrar uma refeição em um dia que ainda não chegou." };
  }

  const nome = String(fd.get("nome") ?? "").trim();
  if (nome.length === 0 || nome.length > 60) {
    return { ok: false, erro: "Dê à refeição um nome de até 60 caracteres." };
  }

  const refeicaoRef = String(fd.get("refeicaoRef") ?? "").trim() || null;
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
    itens = (bruto as ItemPrato[]).map((item) => {
      const gramas = Number(item.quantidade);
      if (!Number.isFinite(gramas) || gramas <= 0 || gramas > 3000) {
        throw new Error("Quantidade fora do intervalo aceito (1 a 3000 g).");
      }
      const descricao = String(item.descricao ?? "").replace(/\s\d+\s?g$/, "").trim();
      if (descricao.length === 0) throw new Error("Todo item precisa de uma descrição.");
      return itemEstimado({
        descricao,
        quantidadeGramas: gramas,
        calorias: numero(item.calorias, 5000),
        proteinaG: numero(item.proteinaG, 400),
        carboidratosG: numero(item.carboidratosG, 700),
        gordurasG: numero(item.gordurasG, 400),
        fibrasG: numero(item.fibrasG, 100),
        confianca: item.confianca ?? "baixa",
        modelo: item.versaoFonte ?? "modelo não identificado",
        origemEstimativa: origem,
      });
    });
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Itens inválidos." };
  }

  await registrarConsumoReal(userId, {
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

function numero(valor: unknown, teto: number): number {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, teto);
}
