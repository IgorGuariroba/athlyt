import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { plans, users } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import {
  abandonarSessao,
  concluirSessao,
  iniciarSessao,
  listarHistoricoSessoes,
  obterSessao,
  registrarSerie,
} from "../repositorio";

const plano: PlanoGerado = {
  regraVersao: "motor-plano-v1",
  modoConservador: false,
  perfilVersao: 1,
  dadosUsados: [],
  nutricao: { calorias: 2400, proteinaG: 160, carboidratosG: 300, gordurasG: 62, fibrasG: 30, estrategia: "Manutenção", refeicoes: [] },
  bloco: {
    duracaoSemanas: 6,
    divisao: "Superior / Inferior",
    dias: [{
      id: "segunda-superior",
      nome: "Superior A",
      diaSemana: "segunda",
      exercicios: [{
        exercicioId: "supino-reto-halteres",
        nome: "Supino reto com halteres",
        padrao: "empurrar-horizontal",
        series: 2,
        repeticoes: "8–10",
        rir: 2,
        descansoSeg: 90,
        justificativa: "Base de força",
        explicacao: {
          porque: "Escolhi halteres porque poupam seu ombro direito e estão na sua academia.",
          dadosUsados: [{ campo: "lesoes", valor: "ombro direito" }],
        },
      }],
    }],
  },
};

async function contexto() {
  const [user] = await db.insert(users).values({ email: `sessao-${randomUUID()}@example.com` }).returning();
  const [plan] = await db.insert(plans).values({
    userId: user.id,
    perfilVersao: 1,
    versao: 1,
    estado: "ativo",
    regraVersao: plano.regraVersao,
    modoConservador: false,
    conteudo: plano,
    activatedAt: new Date(),
  }).returning();
  return { userId: user.id, planoId: plan.id };
}

describe("jornada pública da Sessão de Treino", () => {
  it("inicia pelo dia do Plano Ativo, registra séries como eventos e conclui com resumo", async () => {
    const { userId } = await contexto();
    const iniciada = await iniciarSessao(userId, "segunda-superior");

    expect(iniciada.estado).toBe("em_andamento");
    expect(iniciada.exercicios[0].series).toEqual([
      expect.objectContaining({ numero: 1, cargaKg: null, repeticoes: null, rir: 2 }),
      expect.objectContaining({ numero: 2, cargaKg: null, repeticoes: null, rir: 2 }),
    ]);

    await registrarSerie(userId, iniciada.id, {
      exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 24, repeticoes: 10, rir: 2,
    });
    await registrarSerie(userId, iniciada.id, {
      exercicioId: "supino-reto-halteres", numero: 2, cargaKg: 26, repeticoes: 8, rir: 1,
    });
    const resumo = await concluirSessao(userId, iniciada.id);

    expect(resumo).toEqual(expect.objectContaining({ estado: "concluida", totalSeries: 2, volumeKg: 448 }));
    expect(resumo.eventos.map((evento) => evento.tipo)).toEqual([
      "sessao_iniciada", "serie_registrada", "serie_registrada", "sessao_concluida",
    ]);
    expect(resumo.recordes).toContainEqual(expect.objectContaining({ exercicioId: "supino-reto-halteres", tipo: "e1rm", valor: 32.9 }));
    expect((await listarHistoricoSessoes(userId))[0].id).toBe(iniciada.id);

    const segunda = await iniciarSessao(userId, "segunda-superior");
    expect(segunda.exercicios[0].series[0]).toEqual(expect.objectContaining({ cargaKg: 24, cargaSugeridaKg: 24, repeticoes: 10, melhorCargaAnteriorKg: 26 }));
    await registrarSerie(userId, segunda.id, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 20, repeticoes: 10, rir: 2 });
    await registrarSerie(userId, segunda.id, { exercicioId: "supino-reto-halteres", numero: 2, cargaKg: 20, repeticoes: 8, rir: 2 });
    const segundoResumo = await concluirSessao(userId, segunda.id);
    expect(segundoResumo.recordes).toEqual([]);
  });

  it("abandona com motivo e mantém o desfecho distinguível no histórico", async () => {
    const { userId } = await contexto();
    const iniciada = await iniciarSessao(userId, "segunda-superior");
    await abandonarSessao(userId, iniciada.id, "dor");

    const sessao = await obterSessao(userId, iniciada.id);
    expect(sessao).toEqual(expect.objectContaining({ estado: "abandonada", motivoAbandono: "dor" }));
    expect(sessao?.eventos.at(-1)).toEqual(expect.objectContaining({ tipo: "sessao_abandonada", dados: { motivo: "dor" } }));
  });

  it("congela a explicação do plano no snapshot, para o motivo sobreviver à sessão", async () => {
    // O snapshot existe para que a sessão continue reproduzível depois
    // de o plano evoluir. Se a explicação ficar de fora, o atleta perde
    // o motivo exatamente onde executa o exercício.
    const { userId } = await contexto();
    const iniciada = await iniciarSessao(userId, "segunda-superior");

    const relida = await obterSessao(userId, iniciada.id);
    expect(relida?.exercicios[0].explicacao).toEqual({
      porque: "Escolhi halteres porque poupam seu ombro direito e estão na sua academia.",
      dadosUsados: [{ campo: "lesoes", valor: "ombro direito" }],
    });
  });
});
