import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { decisionTrails, plans, profileVersions, users } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import {
  alternativasParaSessao,
  concluirSessao,
  iniciarSessao,
  listarSubstituicoes,
  registrarSerie,
  substituirExercicioNaSessao,
} from "../repositorio";

const plano: PlanoGerado = {
  regraVersao: "motor-plano-v1", modoConservador: false, perfilVersao: 1, dadosUsados: [],
  nutricao: { calorias: 2400, proteinaG: 160, carboidratosG: 300, gordurasG: 62, fibrasG: 30, estrategia: "Manutenção", refeicoes: [] },
  bloco: {
    duracaoSemanas: 6, divisao: "Superior", dias: [{
      id: "superior-a", nome: "Superior A", diaSemana: "segunda",
      exercicios: [{ exercicioId: "supino-barra", nome: "Supino reto com barra", padrao: "empurrar-horizontal", series: 1, repeticoes: "6–10", rir: 2, descansoSeg: 120, justificativa: "Base de força" }],
    }],
  },
};

async function contexto(equipamentos: string[] = ["halteres", "banco-reto", "supino-maquina"]) {
  const [user] = await db.insert(users).values({ email: `subst-${randomUUID()}@example.com` }).returning();
  await db.insert(profileVersions).values({ userId: user.id, version: 1, respostas: { equipamentos, experienciaTreino: "intermediario" } });
  await db.insert(plans).values({ userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo", regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date() });
  return user.id;
}

describe("substituição de exercício na Sessão de Treino", () => {
  it("oferece alternativas do mesmo padrão viáveis com o equipamento do perfil", async () => {
    const userId = await contexto();
    const sessao = await iniciarSessao(userId, "superior-a");

    const alternativas = await alternativasParaSessao(userId, sessao.id, { exercicioId: "supino-barra", motivo: "equipamento" });

    expect(alternativas[0]).toEqual(expect.objectContaining({ exercicioId: "supino-halteres", preservaEstimulo: true }));
    expect(alternativas.map((a) => a.exercicioId)).not.toContain("supino-barra");
  });

  it("troca preservando a prescrição, registra evento e Trilha de Decisão com motivo", async () => {
    const userId = await contexto();
    const sessao = await iniciarSessao(userId, "superior-a");

    const atualizada = await substituirExercicioNaSessao(userId, sessao.id, {
      exercicioId: "supino-barra", novoExercicioId: "supino-halteres", motivo: "equipamento",
    });

    expect(atualizada.exercicios[0]).toEqual(expect.objectContaining({
      exercicioId: "supino-halteres", substituiuExercicioId: "supino-barra", motivoSubstituicao: "equipamento",
    }));
    expect(atualizada.exercicios[0].series).toHaveLength(1);
    expect(atualizada.exercicios[0].series[0].repeticoesSugeridas).toBe("6–10");
    expect(atualizada.eventos.at(-1)).toEqual(expect.objectContaining({
      tipo: "exercicio_substituido",
      dados: expect.objectContaining({ de: "supino-barra", para: "supino-halteres", motivo: "equipamento" }),
    }));

    const trilhas = await db.select().from(decisionTrails).where(and(eq(decisionTrails.userId, userId), eq(decisionTrails.operacao, "copiloto-sessao")));
    expect(trilhas).toHaveLength(1);
    expect(trilhas[0].perfilVersao).toBe(1);
    expect(trilhas[0].resultado).toEqual(expect.objectContaining({ tipo: "substituicao-em-sessao", motivo: "equipamento" }));
    expect(await listarSubstituicoes(userId, "superior-a")).toEqual([
      expect.objectContaining({ exercicioOriginalId: "supino-barra", exercicioNovoId: "supino-halteres", persistente: true }),
    ]);
  });

  it("não oferece alternativa que carrega a região dolorida relatada", async () => {
    const userId = await contexto();
    const sessao = await iniciarSessao(userId, "superior-a");
    await expect(substituirExercicioNaSessao(userId, sessao.id, {
      exercicioId: "supino-barra", novoExercicioId: "supino-halteres", motivo: "dor", observacao: "dor no ombro",
    })).rejects.toThrow("não preserva o estímulo");
  });

  it("recusa alternativa que não preserva estímulo ou não é viável", async () => {
    const userId = await contexto();
    const sessao = await iniciarSessao(userId, "superior-a");
    await expect(substituirExercicioNaSessao(userId, sessao.id, {
      exercicioId: "supino-barra", novoExercicioId: "agachamento-peso-corpo", motivo: "preferencia",
    })).rejects.toThrow("não preserva o estímulo");
  });

  it("recusa trocar exercício com série já registrada", async () => {
    const userId = await contexto();
    const sessao = await iniciarSessao(userId, "superior-a");
    await registrarSerie(userId, sessao.id, { exercicioId: "supino-barra", numero: 1, cargaKg: 60, repeticoes: 8, rir: 2 });
    await expect(substituirExercicioNaSessao(userId, sessao.id, {
      exercicioId: "supino-barra", novoExercicioId: "supino-halteres", motivo: "equipamento",
    })).rejects.toThrow("séries já registradas");
  });

  it("motivo persistente mantém a troca nas sessões seguintes; preferência vale só na sessão", async () => {
    const userId = await contexto();
    const primeira = await iniciarSessao(userId, "superior-a");
    await substituirExercicioNaSessao(userId, primeira.id, { exercicioId: "supino-barra", novoExercicioId: "supino-halteres", motivo: "dor", observacao: "dor no punho ao segurar a barra" });
    await registrarSerie(userId, primeira.id, { exercicioId: "supino-halteres", numero: 1, cargaKg: 24, repeticoes: 10, rir: 2 });
    await concluirSessao(userId, primeira.id);

    const segunda = await iniciarSessao(userId, "superior-a");
    expect(segunda.exercicios[0]).toEqual(expect.objectContaining({ exercicioId: "supino-halteres", substituiuExercicioId: "supino-barra" }));
    expect(segunda.exercicios[0].series[0].melhorCargaAnteriorKg).toBe(24);

    await substituirExercicioNaSessao(userId, segunda.id, { exercicioId: "supino-halteres", novoExercicioId: "supino-maquina-peito", motivo: "preferencia" });
    await registrarSerie(userId, segunda.id, { exercicioId: "supino-maquina-peito", numero: 1, cargaKg: 40, repeticoes: 10, rir: 2 });
    await concluirSessao(userId, segunda.id);

    const terceira = await iniciarSessao(userId, "superior-a");
    expect(terceira.exercicios[0].exercicioId).toBe("supino-halteres");
  });
});
