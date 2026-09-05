import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { plans, profileVersions, users } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";

const orientarProximaSerie = vi.fn<(entrada: unknown) => Promise<unknown>>();
vi.mock("@/domain/ia/operacoes/copiloto-sessao", () => ({
  orientarProximaSerie: (entrada: unknown) => orientarProximaSerie(entrada),
}));

const { iniciarSessao, registrarOverrideAlertaCautela, registrarSerie } = await import("../repositorio");
const { solicitarOrientacaoProximaSerie } = await import("../copiloto");

const plano: PlanoGerado = {
  regraVersao: "motor-plano-v1",
  modoConservador: false,
  perfilVersao: 1,
  dadosUsados: [],
  nutricao: { calorias: 2400, proteinaG: 160, carboidratosG: 300, gordurasG: 62, fibrasG: 30, estrategia: "Manutenção", refeicoes: [] },
  bloco: {
    duracaoSemanas: 6,
    divisao: "Superior",
    dias: [{
      id: "superior-a",
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
      }],
    }],
  },
};

async function contexto() {
  const [user] = await db.insert(users).values({ email: `copiloto-${randomUUID()}@example.com` }).returning();
  await db.insert(profileVersions).values({
    userId: user.id,
    version: 1,
    respostas: { experienciaTreino: "intermediario", equipamentos: ["halteres"] },
  });
  await db.insert(plans).values({
    userId: user.id,
    perfilVersao: 1,
    versao: 1,
    estado: "ativo",
    regraVersao: plano.regraVersao,
    modoConservador: false,
    conteudo: plano,
    activatedAt: new Date(),
  });
  return user.id;
}

describe("Copiloto de Sessão", () => {
  it("orienta a próxima série com o estado confirmado e a origem auditável da tela", async () => {
    orientarProximaSerie.mockResolvedValue({
      status: "ok",
      valor: {
        cargaSugeridaKg: null,
        repeticoesAlvo: 9,
        rirAlvo: 2,
        descansoSegundos: null,
        justificativa: "Mantenha a execução controlada.",
        alertaCautela: null,
      },
      modeloResolvido: "modelo-test",
      degradado: false,
      contexto: {},
    });
    const userId = await contexto();
    const sessao = await iniciarSessao(userId, "superior-a");
    await registrarSerie(userId, sessao.id, {
      exercicioId: "supino-reto-halteres",
      numero: 1,
      cargaKg: 24,
      repeticoes: 9,
      rir: 2,
    });

    const resultado = await solicitarOrientacaoProximaSerie(userId, sessao.id, {
      exercicioId: "supino-reto-halteres",
      serieRegistrada: 1,
      origem: { tela: "Sessão de Treino", rota: `/sessao/${sessao.id}`, gatilho: "serie-registrada" },
    });

    expect(resultado).toEqual(expect.objectContaining({
      status: "ok",
      orientacao: expect.objectContaining({ cargaSugeridaKg: null, repeticoesAlvo: 9 }),
      versao: "modelo-test",
    }));
    expect(orientarProximaSerie).toHaveBeenCalledWith(expect.objectContaining({
      userId,
      exercicio: expect.objectContaining({
        nome: "Supino reto com halteres",
        serieAtual: 2,
        totalSeries: 2,
        seriesHoje: [{ cargaKg: 24, repeticoes: 9, rir: 2 }],
      }),
      origem: { tela: "Sessão de Treino", rota: `/sessao/${sessao.id}`, gatilho: "serie-registrada" },
    }));
  });

  it("audita o override explícito de um Alerta de Cautela", async () => {
    const userId = await contexto();
    const sessao = await iniciarSessao(userId, "superior-a");

    await registrarOverrideAlertaCautela(userId, sessao.id, {
      exercicioId: "supino-reto-halteres",
      proximaSerie: 2,
      alerta: "Fadiga alta relatada.",
    });

    const relida = await (await import("../repositorio")).obterSessao(userId, sessao.id);
    expect(relida?.eventos.at(-1)).toEqual(expect.objectContaining({
      tipo: "alerta_cautela_ignorado",
      dados: {
        exercicioId: "supino-reto-halteres",
        proximaSerie: 2,
        alerta: "Fadiga alta relatada.",
        decisao: "continuar",
      },
    }));
  });
});
