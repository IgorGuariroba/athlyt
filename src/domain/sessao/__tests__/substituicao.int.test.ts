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
      exercicios: [{
        exercicioId: "supino-barra", nome: "Supino reto com barra", padrao: "empurrar-horizontal",
        series: 3, repeticoes: "6–10", rir: 2, descansoSeg: 120, justificativa: "Base de força",
        explicacao: { porque: "Barra livre porque sua academia tem ráck e você já treina há dois anos.", dadosUsados: [{ campo: "equipamentos", valor: "ráck, barra" }] },
      }],
    }],
  },
};

async function contexto(equipamentos: string[] = ["halteres", "banco-reto", "supino-maquina"]) {
  const [user] = await db.insert(users).values({ email: `subst-${randomUUID()}@example.com` }).returning();
  await db.insert(profileVersions).values({ userId: user!.id, version: 1, respostas: { equipamentos, experienciaTreino: "intermediario" } });
  await db.insert(plans).values({ userId: user!.id, perfilVersao: 1, versao: 1, estado: "ativo", regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date() });
  return user!.id;
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
    expect(atualizada.exercicios[0]!.series).toHaveLength(3);
    expect(atualizada.exercicios[0]!.series[0]!.repeticoesSugeridas).toBe("6–10");
    expect(atualizada.eventos.at(-1)).toEqual(expect.objectContaining({
      tipo: "exercicio_substituido",
      dados: expect.objectContaining({ de: "supino-barra", para: "supino-halteres", motivo: "equipamento" }),
    }));

    const trilhas = await db.select().from(decisionTrails).where(and(eq(decisionTrails.userId, userId), eq(decisionTrails.operacao, "copiloto-sessao")));
    expect(trilhas).toHaveLength(1);
    expect(trilhas[0]!.perfilVersao).toBe(1);
    expect(trilhas[0]!.resultado).toEqual(expect.objectContaining({ tipo: "substituicao-em-sessao", motivo: "equipamento" }));
    expect(await listarSubstituicoes(userId, "superior-a")).toEqual([
      expect.objectContaining({ exercicioOriginalId: "supino-barra", exercicioNovoId: "supino-halteres", persistente: true }),
    ]);
  });

  it("substituto não herda a explicação do exercício que ele trocou", async () => {
    // A explicação justifica *aquele* exercício ("barra livre porque sua
    // academia tem ráck"). O substituto vem de regra determinística, e
    // não do agent: manter o texto do original seria atribuir ao
    // substituto um motivo que ninguém produziu para ele.
    const userId = await contexto();
    const sessao = await iniciarSessao(userId, "superior-a");
    expect(sessao.exercicios[0]!.explicacao).toBeDefined();

    const atualizada = await substituirExercicioNaSessao(userId, sessao.id, {
      exercicioId: "supino-barra", novoExercicioId: "supino-halteres", motivo: "equipamento",
    });

    expect(atualizada.exercicios[0]!.explicacao).toBeUndefined();
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

  it("troca no meio da execução: preserva o que foi feito e transfere as séries restantes", async () => {
    const userId = await contexto();
    const sessao = await iniciarSessao(userId, "superior-a"); // 3 séries prescritas
    await registrarSerie(userId, sessao.id, { exercicioId: "supino-barra", numero: 1, cargaKg: 60, repeticoes: 8, rir: 2 });

    // A dor apareceu durante a execução — o caso central, não a exceção.
    const atualizada = await substituirExercicioNaSessao(userId, sessao.id, {
      exercicioId: "supino-barra", novoExercicioId: "supino-maquina-peito", motivo: "dor", observacao: "dor no ombro",
    });

    expect(atualizada.exercicios).toHaveLength(2);
    const [interrompido, substituto] = atualizada.exercicios;

    // O que foi executado continua sendo do exercício que o atleta fez.
    expect(interrompido).toEqual(expect.objectContaining({ exercicioId: "supino-barra", interrompido: true, seriesPlanejadas: 3 }));
    expect(interrompido!.series).toHaveLength(1);
    expect(interrompido!.series[0]).toEqual(expect.objectContaining({ cargaKg: 60, repeticoes: 8, concluida: true }));

    // O substituto herda apenas o que faltava, renumerado e em branco.
    expect(substituto).toEqual(expect.objectContaining({ exercicioId: "supino-maquina-peito", substituiuExercicioId: "supino-barra", seriesPlanejadas: 2 }));
    expect(substituto!.series.map((serie) => serie.numero)).toEqual([1, 2]);
    expect(substituto!.series.every((serie) => !serie.concluida && serie.cargaKg === null)).toBe(true);

    // A sessão fecha registrando só as séries que restaram.
    await registrarSerie(userId, atualizada.id, { exercicioId: "supino-maquina-peito", numero: 1, cargaKg: 40, repeticoes: 10, rir: 2 });
    await registrarSerie(userId, atualizada.id, { exercicioId: "supino-maquina-peito", numero: 2, cargaKg: 40, repeticoes: 10, rir: 2 });
    const resumo = await concluirSessao(userId, atualizada.id);
    expect(resumo.totalSeries).toBe(3);
    expect(resumo.estado).toBe("concluida");
  });

  it("não permite substituir de novo um exercício já interrompido", async () => {
    const userId = await contexto();
    const sessao = await iniciarSessao(userId, "superior-a");
    await registrarSerie(userId, sessao.id, { exercicioId: "supino-barra", numero: 1, cargaKg: 60, repeticoes: 8, rir: 2 });
    await substituirExercicioNaSessao(userId, sessao.id, { exercicioId: "supino-barra", novoExercicioId: "supino-halteres", motivo: "dor", observacao: "dor no punho" });
    await expect(substituirExercicioNaSessao(userId, sessao.id, {
      exercicioId: "supino-barra", novoExercicioId: "supino-maquina-peito", motivo: "equipamento",
    })).rejects.toThrow("já foi substituído");
  });

  it("substituto usa o próprio Último Registro da Série", async () => {
    const userId = await contexto();
    const primeira = await iniciarSessao(userId, "superior-a");
    const substituida = await substituirExercicioNaSessao(userId, primeira.id, {
      exercicioId: "supino-barra", novoExercicioId: "supino-maquina-peito", motivo: "preferencia",
    });
    await registrarSerie(userId, substituida.id, {
      exercicioId: "supino-maquina-peito", numero: 1, cargaKg: 42, repeticoes: 9, rir: 1,
    });
    await concluirSessao(userId, substituida.id);

    const segunda = await iniciarSessao(userId, "superior-a");
    const novamenteSubstituida = await substituirExercicioNaSessao(userId, segunda.id, {
      exercicioId: "supino-barra", novoExercicioId: "supino-maquina-peito", motivo: "preferencia",
    });

    expect(novamenteSubstituida.exercicios[0]!.series[0]).toEqual(expect.objectContaining({
      cargaKg: 42, repeticoes: 9, rir: 1,
    }));
  });

  it("a marca a bater do substituto é a do exercício novo, e resumo e tela concordam", async () => {
    // Defeito fechado aqui: a marca histórica vinha no spread do
    // exercício antigo, então a tela media as séries do substituto
    // contra a barra que o atleta deixou de usar, enquanto o resumo
    // consultava pelo exercicioId novo e acertava.
    const userId = await contexto();
    const anterior = await iniciarSessao(userId, "superior-a");
    const comSubstituto = await substituirExercicioNaSessao(userId, anterior.id, {
      exercicioId: "supino-barra", novoExercicioId: "supino-maquina-peito", motivo: "preferencia",
    });
    await registrarSerie(userId, comSubstituto.id, { exercicioId: "supino-maquina-peito", numero: 1, cargaKg: 40, repeticoes: 10, rir: 2 });
    await concluirSessao(userId, comSubstituto.id);

    const sessao = await iniciarSessao(userId, "superior-a");
    await registrarSerie(userId, sessao.id, { exercicioId: "supino-barra", numero: 1, cargaKg: 90, repeticoes: 10, rir: 2 });
    const substituida = await substituirExercicioNaSessao(userId, sessao.id, {
      exercicioId: "supino-barra", novoExercicioId: "supino-maquina-peito", motivo: "dor", observacao: "dor no punho",
    });

    // A referência que a tela usa é a da máquina (40 × 10), não a da barra.
    const substituto = substituida.exercicios[1];
    expect(substituto!.marcaAnterior?.cargaKg).toBe(40);

    await registrarSerie(userId, substituida.id, { exercicioId: "supino-maquina-peito", numero: 1, cargaKg: 50, repeticoes: 10, rir: 2 });
    const resumo = await concluirSessao(userId, substituida.id);
    expect(resumo.recordes).toContainEqual(expect.objectContaining({ exercicioId: "supino-maquina-peito", tipo: "e1rm" }));
  });

  it("substituir sem nenhuma série feita troca no lugar, sem dividir", async () => {
    const userId = await contexto();
    const sessao = await iniciarSessao(userId, "superior-a");
    const atualizada = await substituirExercicioNaSessao(userId, sessao.id, {
      exercicioId: "supino-barra", novoExercicioId: "supino-halteres", motivo: "equipamento",
    });
    expect(atualizada.exercicios).toHaveLength(1);
    expect(atualizada.exercicios[0]!.series).toHaveLength(3);
  });

  it("motivo persistente mantém a troca nas sessões seguintes; preferência vale só na sessão", async () => {
    const userId = await contexto();
    const primeira = await iniciarSessao(userId, "superior-a");
    await substituirExercicioNaSessao(userId, primeira.id, { exercicioId: "supino-barra", novoExercicioId: "supino-halteres", motivo: "dor", observacao: "dor no punho ao segurar a barra" });
    for (const numero of [1, 2, 3]) await registrarSerie(userId, primeira.id, { exercicioId: "supino-halteres", numero, cargaKg: 24, repeticoes: 10, rir: 1 });
    await concluirSessao(userId, primeira.id);

    const segunda = await iniciarSessao(userId, "superior-a");
    expect(segunda.exercicios[0]).toEqual(expect.objectContaining({ exercicioId: "supino-halteres", substituiuExercicioId: "supino-barra" }));
    expect(segunda.exercicios[0]!.series[0]).toEqual(expect.objectContaining({
      cargaKg: 24, repeticoes: 10, rir: 1,
    }));
    expect(segunda.exercicios[0]!.marcaAnterior?.cargaKg).toBe(24);

    await substituirExercicioNaSessao(userId, segunda.id, { exercicioId: "supino-halteres", novoExercicioId: "supino-maquina-peito", motivo: "preferencia" });
    for (const numero of [1, 2, 3]) await registrarSerie(userId, segunda.id, { exercicioId: "supino-maquina-peito", numero, cargaKg: 40, repeticoes: 10, rir: 2 });
    await concluirSessao(userId, segunda.id);

    const terceira = await iniciarSessao(userId, "superior-a");
    expect(terceira.exercicios[0]!.exercicioId).toBe("supino-halteres");
  });
});
