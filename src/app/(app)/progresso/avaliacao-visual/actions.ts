"use server";


import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { invalidarLeituras } from "@/app/_invalidacao";

import { revogar } from "@/domain/ia/consentimento";
import { obterRecorte } from "@/domain/ia/contexto/recortes";
import { analisarFotosCorporais } from "@/domain/ia/operacoes/avaliacao-visual";
import { consolidarAvaliacaoVisual } from "@/domain/medicoes/avaliacao-visual";
import { lerFotosCorporais } from "@/domain/medicoes/fotos";
import { listarMedicoesCorporais, registrarAvaliacaoVisual, revogarAvaliacoesVisuais } from "@/domain/medicoes/repositorio";

export async function executarAvaliacaoVisual(fd: FormData) {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const userId = session.user.id;
  if (fd.get("consentimentoIA") !== "sim") redirect("/progresso/avaliacao-visual?erro=Confirme o consentimento específico para esta análise.");
  const ids = [...new Set(fd.getAll("fotoId").map(String))].slice(0, 4);
  if (ids.length < 2) redirect("/progresso/avaliacao-visual?erro=Selecione ao menos duas fotos do mesmo conjunto.");
  const imagens = await lerFotosCorporais(userId, ids);
  if (!imagens) redirect("/progresso/avaliacao-visual?erro=Uma das fotos não está disponível.");
  const medicoes = await listarMedicoesCorporais(userId);
  const resultado = await analisarFotosCorporais({ userId, fotos: imagens.map((foto) => ({ id: foto.id, pose: foto.pose, condicoes: foto.condicoes, dados: foto.dados, mediaType: foto.mediaType })), medicoesComparaveis: medicoes });
  if (resultado.status !== "ok") redirect("/progresso/avaliacao-visual?erro=A análise está temporariamente indisponível. Nenhuma conclusão foi salva.");
  const consolidada = consolidarAvaliacaoVisual(resultado.valor);
  await registrarAvaliacaoVisual(userId, { photoIds: ids, criterios: consolidada.criterios, gorduraMinBasisPoints: consolidada.gorduraVisual.minimoBasisPoints, gorduraMaxBasisPoints: consolidada.gorduraVisual.maximoBasisPoints, observacoes: consolidada.observacoes, limitacoes: consolidada.limitacoes, confianca: consolidada.confianca, metodologiaVersao: consolidada.metodologiaVersao, modeloResolvido: resultado.modeloResolvido });
  const destino = "/progresso/avaliacao-visual?sucesso=Avaliação visual concluída.";
  invalidarLeituras([{ fato: "medicoes" }, { fato: "consentimento" }], { destino });
  redirect(destino);
}

const CAMPOS = obterRecorte("avaliacao-visual").campos.map((campo) => campo.id);

export async function revogarConsentimentoVisual() {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const userId = session.user.id;
  await Promise.all(CAMPOS.map((campo) => revogar(userId, "avaliacao-visual", campo)));
  await revogarAvaliacoesVisuais(userId);
  const destino = "/progresso/avaliacao-visual?sucesso=Consentimento revogado e projeção visual removida do uso ativo.";
  invalidarLeituras([{ fato: "consentimento" }, { fato: "medicoes" }], { destino });
  redirect(destino);
}
