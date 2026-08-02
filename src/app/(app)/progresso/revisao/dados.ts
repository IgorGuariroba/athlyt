import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { obterPanoramaCorporal } from "@/domain/medicoes/repositorio";
import type { ConfiancaCorporal } from "@/domain/medicoes";
import type { DimensoesScorecard, EvidenciaCorporal } from "@/domain/medicoes/revisao-corporal";

export type RevisaoApresentacao = {
  id: string; estado: "pendente" | "aplicada" | "rejeitada" | "desfeita"; periodoInicio: Date; periodoFim: Date;
  scorecard: DimensoesScorecard & { geral: number; metodologiaVersao: string };
  confiancas: ConfiancaCorporal; evidencias: EvidenciaCorporal[];
  proposta: { tipo: "manter" | "auto_aplicado" | "estrutural"; exigeAprovacao: boolean; justificativa: string };
};
export async function obterRevisaoAtual(): Promise<RevisaoApresentacao | null> {
  const session = await auth(); if (!session?.user?.id) redirect("/");
  const panorama = await obterPanoramaCorporal(session.user.id);
  return (panorama.revisoes[0] as unknown as RevisaoApresentacao | undefined) ?? null;
}
