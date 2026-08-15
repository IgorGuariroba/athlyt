"use server";

import { auth } from "@/auth";
import { itemEstimado } from "@/domain/alimentos/prato";
import type { ItemPrato } from "@/domain/alimentos/prato";
import {
  LIMITE_FOTO_REFEICAO_BYTES,
  prepararFotoRefeicao,
  TIPOS_FOTO_REFEICAO,
} from "@/domain/alimentos/foto-refeicao";
import { FUSO_PADRAO } from "@/domain/diario/dia-alimentar";
import { hojeDoUsuario, montarDiarioDoDia } from "@/domain/diario/repositorio";
import { conceder } from "@/domain/ia/consentimento";
import { montarNucleo } from "@/domain/ia/contexto/nucleo";
import { estimarRefeicaoPorFoto } from "@/domain/ia/operacoes/refeicao-foto";
import { NOME_PROVEDOR } from "@/domain/ia/provedor";
import { obterPerfilVigente } from "@/domain/triagem/perfil";

const CAMPOS = ["foto-refeicao", "metas-restantes", "restricoes"];

export interface RefeicaoEstimadaNaTela {
  nome: string;
  itens: ItemPrato[];
  limitacoes: string[];
  confianca: "alta" | "media" | "baixa";
  modelo: string;
}

export type ResultadoEstimativa =
  | { ok: true; estimativa: RefeicaoEstimadaNaTela }
  | { ok: false; erro: string };

/**
 * Estima a refeição a partir da foto e devolve o resultado **sem
 * gravar nada**.
 *
 * A separação entre estimar e registrar é o ponto do fluxo: a IA
 * propõe, o atleta confirma. Gravar direto tornaria impossível
 * corrigir a porção antes de o número entrar no Diário — e a porção é
 * justamente o que uma foto estima pior.
 *
 * A foto não é persistida em lugar nenhum: ela vive no corpo da
 * requisição, vai ao provedor e é descartada. Por isso o consentimento
 * aqui é do envio à IA, e não de armazenamento.
 */
export async function estimarRefeicaoAction(fd: FormData): Promise<ResultadoEstimativa> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  const userId = session.user.id;

  const arquivo = fd.get("foto");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: "Tire ou escolha uma foto do prato." };
  }
  if (!TIPOS_FOTO_REFEICAO.has(arquivo.type) || arquivo.size > LIMITE_FOTO_REFEICAO_BYTES) {
    return { ok: false, erro: "Use JPG, PNG ou WebP com até 10 MB." };
  }

  const fuso = FUSO_PADRAO;
  const dia = String(fd.get("dia") ?? "") || hojeDoUsuario(fuso);
  const observacao = String(fd.get("observacao") ?? "");

  let foto;
  try {
    foto = await prepararFotoRefeicao({
      bytes: new Uint8Array(await arquivo.arrayBuffer()),
      contentType: arquivo.type,
    });
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Foto inválida." };
  }

  const perfil = await obterPerfilVigente(userId);
  const nucleo = montarNucleo({
    perfilVersao: perfil?.version ?? 0,
    respostas: perfil?.respostas ?? {},
    respondidoEm: perfil?.createdAt ?? new Date(),
    agora: new Date(),
  });
  const diario = await montarDiarioDoDia(userId, { dia, fuso });

  // O consentimento é registrado no ato do envio: o atleta tocou em
  // "estimar" sabendo, pelo texto derivado do Recorte, o que sai do
  // aparelho. Sem isto o campo sensível seria omitido e a operação
  // rodaria cega sobre a própria foto.
  await conceder(userId, "refeicao-foto", CAMPOS, NOME_PROVEDOR);

  const resultado = await estimarRefeicaoPorFoto({
    userId,
    nucleo,
    foto: { dados: new Uint8Array(foto.corpo), mediaType: foto.contentType },
    metasRestantes: diario.painel.restante,
    restricoes: nucleo.restricoesAlimentares?.valor,
    observacao,
  });

  if (resultado.status !== "ok") {
    return {
      ok: false,
      erro: "A estimativa está indisponível agora. Nada foi registrado — você pode registrar pela busca ou manualmente.",
    };
  }

  return {
    ok: true,
    estimativa: {
      nome: resultado.valor.nome,
      itens: resultado.valor.itens.map((item) =>
        itemEstimado({ ...item, modelo: resultado.modeloResolvido }),
      ),
      limitacoes: resultado.valor.limitacoes,
      confianca: resultado.valor.confianca,
      modelo: resultado.modeloResolvido,
    },
  };
}
