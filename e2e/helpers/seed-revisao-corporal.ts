import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { bodyFatMeasurements, bodyMeasurements, plans, profileVersions, progressPhotos, weeklyBodyReviews, workoutSessions } from "@/db/schema";
import { PROTOCOLO_CIRCUNFERENCIAS_VERSAO } from "@/domain/medicoes";
import type { PlanoGerado } from "@/domain/plano/tipos";
import type { RespostasTriagem } from "@/domain/triagem/etapas";
import { allowEmail, seedAuthenticatedSession } from "./seed-session";

export async function seedAtletaComConfiancaIncompleta() {
  const email = `e2e-confianca-197-${crypto.randomUUID()}@example.com`;
  await allowEmail(email);
  const sessao = await seedAuthenticatedSession(email);
  const userId = sessao.user.id;
  const respostas: RespostasTriagem = {
    dataNascimento: "1990-01-01", sexoBiologico: "masculino", pesoKg: 80, alturaCm: 180,
    experienciaTreino: "intermediario", diasDisponiveis: ["segunda"], duracaoSessaoMin: 60,
    localTreino: "academia-completa", lesoes: "", condicoes: "",
    // Equipamentos e objetivo ausentes, não respostas explícitas vazias.
  };
  const conteudo: PlanoGerado = {
    regraVersao: "motor-plano-v1", modoConservador: false, perfilVersao: 1, dadosUsados: [],
    nutricao: { calorias: 2400, proteinaG: 160, carboidratosG: 300, gordurasG: 62, fibrasG: 30, estrategia: "Manutenção", refeicoes: [] },
    bloco: { duracaoSemanas: 6, divisao: "Corpo inteiro", dias: [{
      id: "corpo-inteiro", nome: "Corpo inteiro A", diaSemana: "segunda",
      // Dez séries tornam o corte de 10% observável, sem arredondar de volta.
      exercicios: [{ exercicioId: "supino-halteres", nome: "Supino reto com halteres", padrao: "empurrar-horizontal", series: 10, repeticoes: "8–10", rir: 2, descansoSeg: 90, justificativa: "Base de força" }],
    }] },
  };
  await db.insert(profileVersions).values({ userId, version: 1, respostas });
  const [plano] = await db.insert(plans).values({
    userId, perfilVersao: 1, versao: 1, estado: "ativo", regraVersao: conteudo.regraVersao,
    modoConservador: false, conteudo, activatedAt: new Date(),
  }).returning();
  if (!plano) throw new Error("Falha ao criar Plano Ativo para revisão.");

  // Sem janela suficiente ou com treino faltante (evidência contra de qualidade alta),
  // a régua antiga também manteria o plano: esses bloqueios não podem mascarar #197.
  const observadoEm = new Date(Date.now() - 21 * 86_400_000);
  const unilaterais = ["cintura", "pescoco", "quadril", "torax", "ombros"].map((regiao) => ({ regiao, lado: "unico" as const }));
  const bilaterais = ["braco", "coxa", "panturrilha"].flatMap((regiao) =>
    (["direito", "esquerdo"] as const).map((lado) => ({ regiao, lado })));
  await db.insert(bodyMeasurements).values([...unilaterais, ...bilaterais].map((medida) => ({
    ...medida, userId, leiturasMm: [800], valorMm: 800, qualidade: "moderada" as const,
    protocoloVersao: PROTOCOLO_CIRCUNFERENCIAS_VERSAO, observadoEm,
  })));
  await db.insert(bodyFatMeasurements).values({ userId, percentualBasisPoints: 2000, metodo: "bioimpedancia", confianca: "moderada", observadoEm });
  await db.insert(workoutSessions).values({
    userId, planId: plano.id, diaId: "corpo-inteiro", nome: "Corpo inteiro A",
    estado: "concluida", exercicios: [], startedAt: new Date(Date.now() - 86_400_000), endedAt: new Date(Date.now() - 86_400_000 + 3_600_000),
  });
  return { ...sessao, respostas, plano };
}

export async function seedAtletaComApenasTreinamentoPendente() {
  const atleta = await seedAtletaComConfiancaIncompleta();
  const respostas: RespostasTriagem = { ...atleta.respostas, objetivoComposicao: "recomposicao" };
  await db.insert(profileVersions).values({ userId: atleta.user.id, version: 2, respostas });
  // Esta jornada consulta presença de foto, não download/renderização do objeto.
  await db.insert(progressPhotos).values({
    userId: atleta.user.id, pose: "frente", objectKey: `e2e/${atleta.user.id}/frente.jpg`,
  });
  return { ...atleta, respostas };
}

export async function lerEstadoAposRevisao(userId: string) {
  const [planos, revisoes] = await Promise.all([
    db.select().from(plans).where(eq(plans.userId, userId)),
    db.select().from(weeklyBodyReviews).where(eq(weeklyBodyReviews.userId, userId)),
  ]);
  return { planos, revisoes };
}
