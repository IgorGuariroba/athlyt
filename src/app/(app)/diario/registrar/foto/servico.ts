import { itemEstimado, type ItemPrato } from "@/domain/alimentos/prato";
import {
  LIMITE_FOTO_REFEICAO_BYTES,
  prepararFotoRefeicao,
  TIPOS_FOTO_REFEICAO,
} from "@/domain/alimentos/foto-refeicao";
import { FUSO_PADRAO } from "@/domain/diario/dia-alimentar";
import { hojeDoUsuario, montarDiarioDoDia } from "@/domain/diario/repositorio";
import { conceder } from "@/domain/ia/consentimento";
import { montarNucleo } from "@/domain/ia/contexto/nucleo";
import type { EventoProgressoFallback } from "@/domain/ia/fallback-modelo";
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
  | { ok: false; erro: string; cancelada?: boolean };

/** Caso de uso compartilhado pela compatibilidade Server Action e pela rota streaming. */
export async function estimarRefeicao(
  fd: FormData,
  opcoes: {
    userId: string;
    signal?: AbortSignal;
    aoProgresso?: (evento: EventoProgressoFallback) => void;
  },
): Promise<ResultadoEstimativa> {
  const arquivo = fd.get("foto");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: "Tire ou escolha uma foto do prato." };
  }
  if (!TIPOS_FOTO_REFEICAO.has(arquivo.type) || arquivo.size > LIMITE_FOTO_REFEICAO_BYTES) {
    return { ok: false, erro: "Use JPG, PNG ou WebP com até 10 MB." };
  }

  const dia = String(fd.get("dia") ?? "") || hojeDoUsuario(FUSO_PADRAO);
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

  if (opcoes.signal?.aborted) return { ok: false, erro: "Estimativa cancelada.", cancelada: true };

  const perfil = await obterPerfilVigente(opcoes.userId);
  const nucleo = montarNucleo({
    perfilVersao: perfil?.version ?? 0,
    respostas: perfil?.respostas ?? {},
    respondidoEm: perfil?.createdAt ?? new Date(),
    agora: new Date(),
  });
  const diario = await montarDiarioDoDia(opcoes.userId, { dia, fuso: FUSO_PADRAO });
  await conceder(opcoes.userId, "refeicao-foto", CAMPOS, NOME_PROVEDOR);

  const resultado = await estimarRefeicaoPorFoto({
    userId: opcoes.userId,
    nucleo,
    foto: { dados: new Uint8Array(foto.corpo), mediaType: foto.contentType },
    metasRestantes: diario.painel.restante,
    restricoes: nucleo.restricoesAlimentares?.valor,
    observacao,
    signal: opcoes.signal,
    aoProgresso: opcoes.aoProgresso,
  });

  if (resultado.status !== "ok") {
    return {
      ok: false,
      cancelada: resultado.cancelada,
      erro: resultado.cancelada
        ? "Estimativa cancelada. Nada foi registrado."
        : "A estimativa está indisponível agora. Nada foi registrado — você pode registrar pela busca ou manualmente.",
    };
  }

  return {
    ok: true,
    estimativa: {
      nome: resultado.valor.nome,
      itens: resultado.valor.itens.map((item) => itemEstimado({ ...item, modelo: resultado.modeloResolvido })),
      limitacoes: resultado.valor.limitacoes,
      confianca: resultado.valor.confianca,
      modelo: resultado.modeloResolvido,
    },
  };
}
