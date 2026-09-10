import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { plans, users, workoutSessions } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import type { EventoOutbox } from "../outbox";
import { iniciarSessao, obterSessao, registrarSerie, type ExercicioSessao } from "../repositorio";
import { listarConflitosPendentes, resolverConflito, sincronizarEventos } from "../sincronizacao";

const plano: PlanoGerado = {
  regraVersao: "motor-plano-v1", modoConservador: false, perfilVersao: 1, dadosUsados: [],
  nutricao: { calorias: 2400, proteinaG: 160, carboidratosG: 300, gordurasG: 62, fibrasG: 30, estrategia: "Manutenção", refeicoes: [] },
  bloco: { duracaoSemanas: 6, divisao: "Superior / Inferior", dias: [{
    id: "segunda-superior", nome: "Superior A", diaSemana: "segunda",
    exercicios: [{ exercicioId: "supino-reto-halteres", nome: "Supino reto com halteres", padrao: "empurrar-horizontal", series: 2, repeticoes: "8–10", rir: 2, descansoSeg: 90, justificativa: "Base" }],
  }] },
};

async function contexto() {
  const [user] = await db.insert(users).values({ email: `sync-${randomUUID()}@example.com` }).returning();
  await db.insert(plans).values({
    userId: user!.id, perfilVersao: 1, versao: 1, estado: "ativo", regraVersao: plano.regraVersao,
    modoConservador: false, conteudo: plano, activatedAt: new Date(),
  });
  const sessao = await iniciarSessao(user!.id, "segunda-superior");
  return { userId: user!.id, sessionId: sessao.id };
}

function evento(sessionId: string, ordem: number, dados: Record<string, unknown>, tipo: EventoOutbox["tipo"] = "serie_registrada", id = randomUUID()): EventoOutbox {
  return { id, sessionId, tipo, ordem, ocorridoEm: new Date(Date.now() + ordem * 1000).toISOString(), dados };
}

describe("sincronização da fila offline", () => {
  it("aplica a fila e ignora o reenvio integral sem duplicar eventos", async () => {
    const { userId, sessionId } = await contexto();
    const fila = [
      evento(sessionId, 1, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 30, repeticoes: 10, rir: 2 }),
      evento(sessionId, 2, { exercicioId: "supino-reto-halteres", numero: 2, cargaKg: 32, repeticoes: 8, rir: 1 }),
      evento(sessionId, 3, {}, "sessao_concluida"),
    ];

    const primeira = await sincronizarEventos(userId, sessionId, fila);
    expect(primeira.aplicados).toHaveLength(3);
    expect(primeira.conflitos).toEqual([]);

    const segunda = await sincronizarEventos(userId, sessionId, fila);
    expect(segunda.aplicados).toEqual([]);
    expect(segunda.duplicados).toHaveLength(3);

    const sessao = await obterSessao(userId, sessionId);
    expect(sessao?.estado).toBe("concluida");
    expect(sessao?.exercicios[0]?.series.filter((s) => s.concluida)).toHaveLength(2);
    // Um evento de início (servidor) + três da fila, contados uma vez só.
    expect(sessao?.eventos.filter((e) => e.tipo === "serie_registrada")).toHaveLength(2);
    expect(sessao?.eventos).toHaveLength(4);
  });

  it("sincroniza em lotes parciais chegando ao mesmo estado", async () => {
    const { userId, sessionId } = await contexto();
    const a = evento(sessionId, 1, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 30, repeticoes: 10, rir: 2 });
    const b = evento(sessionId, 2, { exercicioId: "supino-reto-halteres", numero: 2, cargaKg: 32, repeticoes: 8, rir: 2 });

    await sincronizarEventos(userId, sessionId, [a]);
    // Reenvio com sobreposição: o lote seguinte repete o primeiro evento.
    const resultado = await sincronizarEventos(userId, sessionId, [a, b]);
    expect(resultado.duplicados).toEqual([a.id]);
    expect(resultado.aplicados).toEqual([b.id]);

    const sessao = await obterSessao(userId, sessionId);
    expect(sessao?.exercicios[0]?.series.map((s) => s.cargaKg)).toEqual([30, 32]);
  });

  it("apresenta divergência sobre série já gravada online sem sobrescrever nem descartar", async () => {
    const { userId, sessionId } = await contexto();
    await registrarSerie(userId, sessionId, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 40, repeticoes: 10, rir: 2 });

    const offline = evento(sessionId, 1, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 60, repeticoes: 6, rir: 0 });
    const resultado = await sincronizarEventos(userId, sessionId, [offline]);

    expect(resultado.aplicados).toEqual([]);
    expect(resultado.conflitos).toHaveLength(1);
    expect(resultado.conflitos[0]).toMatchObject({
      motivo: "serie_divergente",
      servidor: { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 40, repeticoes: 10, rir: 2 },
      dispositivo: { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 60, repeticoes: 6, rir: 0 },
    });
    expect((await obterSessao(userId, sessionId))?.exercicios[0]?.series[0]?.cargaKg).toBe(40);

    // Reenviar não multiplica o conflito.
    const reenvio = await sincronizarEventos(userId, sessionId, [offline]);
    expect(reenvio.conflitos).toHaveLength(1);
    expect(await listarConflitosPendentes(userId)).toHaveLength(1);
  });

  it("resolve conflito pelo dispositivo aplicando o valor registrado offline", async () => {
    const { userId, sessionId } = await contexto();
    await registrarSerie(userId, sessionId, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 40, repeticoes: 10, rir: 2 });
    const offline = evento(sessionId, 1, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 60, repeticoes: 6, rir: 0 });
    const { conflitos } = await sincronizarEventos(userId, sessionId, [offline]);

    await resolverConflito(userId, conflitos[0]!.id, "dispositivo");

    expect((await obterSessao(userId, sessionId))?.exercicios[0]?.series[0]).toMatchObject({ cargaKg: 60, repeticoes: 6, rir: 0 });
    expect(await listarConflitosPendentes(userId)).toEqual([]);
    await expect(resolverConflito(userId, conflitos[0]!.id, "servidor")).rejects.toThrow("já resolvido");
  });

  it("resolve conflito pelo servidor preservando o estado gravado", async () => {
    const { userId, sessionId } = await contexto();
    await registrarSerie(userId, sessionId, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 40, repeticoes: 10, rir: 2 });
    const offline = evento(sessionId, 1, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 60, repeticoes: 6, rir: 0 });
    const { conflitos } = await sincronizarEventos(userId, sessionId, [offline]);

    await resolverConflito(userId, conflitos[0]!.id, "servidor");
    expect((await obterSessao(userId, sessionId))?.exercicios[0]?.series[0]?.cargaKg).toBe(40);
    expect(await listarConflitosPendentes(userId)).toEqual([]);
  });

  it("aplica a correção de série registrada pela fila, mantendo a conclusão", async () => {
    const { userId, sessionId } = await contexto();
    await registrarSerie(userId, sessionId, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 48, repeticoes: 10, rir: 2 });

    const correcao = evento(sessionId, 1, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 56, repeticoes: 10, rir: 2, anterior: { cargaKg: 48, repeticoes: 10, rir: 2 } }, "serie_corrigida");
    const resultado = await sincronizarEventos(userId, sessionId, [correcao]);

    expect(resultado.aplicados).toEqual([correcao.id]);
    expect(resultado.conflitos).toEqual([]);
    const sessao = await obterSessao(userId, sessionId);
    expect(sessao?.exercicios[0]?.series[0]).toMatchObject({ cargaKg: 56, repeticoes: 10, rir: 2, concluida: true });
    expect(sessao?.eventos.filter((e) => e.tipo === "serie_corrigida")).toHaveLength(1);
  });

  it("corrige série de exercício interrompido pela fila sem reativá-lo", async () => {
    const { userId, sessionId } = await contexto();
    await registrarSerie(userId, sessionId, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 48, repeticoes: 10, rir: 2 });

    const [linha] = await db.select().from(workoutSessions).where(eq(workoutSessions.id, sessionId)).limit(1);
    const exercicios = (linha!.exercicios as ExercicioSessao[]).map((exercicio) =>
      exercicio.exercicioId === "supino-reto-halteres" ? { ...exercicio, interrompido: true } : exercicio);
    await db.update(workoutSessions).set({ exercicios }).where(eq(workoutSessions.id, sessionId));

    const correcao = evento(sessionId, 1, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 56, repeticoes: 10, rir: 2, anterior: { cargaKg: 48, repeticoes: 10, rir: 2 } }, "serie_corrigida");
    const resultado = await sincronizarEventos(userId, sessionId, [correcao]);

    expect(resultado.aplicados).toEqual([correcao.id]);
    expect((await obterSessao(userId, sessionId))?.exercicios[0]?.series[0]).toMatchObject({ cargaKg: 56, concluida: true });
  });

  it("escala edição concorrente para conflito e aplica a correção escolhida", async () => {
    // Dois aparelhos corrigiram a mesma série partindo do mesmo valor:
    // quem sincronizou por último não sobrescreve o primeiro em
    // silêncio — o atleta escolhe.
    const { userId, sessionId } = await contexto();
    await registrarSerie(userId, sessionId, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 48, repeticoes: 10, rir: 2 });
    const primeiro = evento(sessionId, 1, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 60, repeticoes: 10, rir: 2, anterior: { cargaKg: 48, repeticoes: 10, rir: 2 } }, "serie_corrigida");
    const segundo = evento(sessionId, 2, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 56, repeticoes: 10, rir: 2, anterior: { cargaKg: 48, repeticoes: 10, rir: 2 } }, "serie_corrigida");

    const primeira = await sincronizarEventos(userId, sessionId, [primeiro]);
    expect(primeira.aplicados).toEqual([primeiro.id]);

    const segunda = await sincronizarEventos(userId, sessionId, [segundo]);
    expect(segunda.conflitos).toHaveLength(1);
    expect((await obterSessao(userId, sessionId))?.exercicios[0]?.series[0]?.cargaKg).toBe(60);

    await resolverConflito(userId, segunda.conflitos[0]!.id, "dispositivo");
    const sessao = await obterSessao(userId, sessionId);
    expect(sessao?.exercicios[0]?.series[0]).toMatchObject({ cargaKg: 56, repeticoes: 10, rir: 2, concluida: true });
    expect(sessao?.eventos.filter((e) => e.tipo === "serie_corrigida")).toHaveLength(2);
    expect(await listarConflitosPendentes(userId)).toEqual([]);
  });

  it("recusa correção de série não concluída", async () => {
    const { userId, sessionId } = await contexto();
    const correcao = evento(sessionId, 1, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 56, repeticoes: 10, rir: 2, anterior: { cargaKg: 48, repeticoes: 10, rir: 2 } }, "serie_corrigida");

    const resultado = await sincronizarEventos(userId, sessionId, [correcao]);

    expect(resultado.aplicados).toEqual([]);
    expect(resultado.conflitos).toHaveLength(1);
    expect((await obterSessao(userId, sessionId))?.exercicios[0]?.series[0]?.concluida).toBe(false);
  });

  it("não deixa série tardia alterar a sessão já concluída", async () => {
    const { userId, sessionId } = await contexto();
    // A ordem é a do dispositivo: o atleta encerrou e só depois
    // registrou mais uma série, tudo offline no mesmo aparelho.
    const fim = evento(sessionId, 1, {}, "sessao_concluida");
    const tardia = evento(sessionId, 2, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 30, repeticoes: 10, rir: 2 });

    const resultado = await sincronizarEventos(userId, sessionId, [fim, tardia]);

    expect(resultado.aplicados).toEqual([fim.id]);
    expect(resultado.conflitos).toHaveLength(1);
    expect(resultado.conflitos[0]).toMatchObject({ motivo: "sessao_ja_encerrada", eventoId: tardia.id });

    // A linha persistida não mudou: nem o resumo daquele treino nem as
    // cargas sugeridas das próximas sessões são reescritas depois do fato.
    const sessao = await obterSessao(userId, sessionId);
    expect(sessao?.estado).toBe("concluida");
    expect(sessao?.exercicios[0]?.series.every((s) => !s.concluida)).toBe(true);

    // E o caminho online recusa o mesmo registro pelo mesmo motivo.
    await expect(registrarSerie(userId, sessionId, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 30, repeticoes: 10, rir: 2 }))
      .rejects.toThrow("Sessão não está em andamento.");
  });

  it("recusa registro fora de faixa nos dois caminhos de escrita, sem pedir decisão ao atleta", async () => {
    const { userId, sessionId } = await contexto();
    const forjado = evento(sessionId, 1, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 30, repeticoes: 10, rir: 47 });

    const resultado = await sincronizarEventos(userId, sessionId, [forjado]);

    expect(resultado.aplicados).toEqual([]);
    expect(resultado.conflitos).toEqual([]);
    expect(await listarConflitosPendentes(userId)).toEqual([]);
    expect((await obterSessao(userId, sessionId))?.exercicios[0]?.series[0]?.concluida).toBe(false);

    await expect(registrarSerie(userId, sessionId, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 30, repeticoes: 10, rir: 47 }))
      .rejects.toThrow("Valores da série inválidos.");
  });

  it("recusa fila de sessão de outro usuário", async () => {
    const { sessionId } = await contexto();
    const [outro] = await db.insert(users).values({ email: `intruso-${randomUUID()}@example.com` }).returning();
    if (!outro) throw new Error("Falha ao criar usuário de teste.");
    await expect(sincronizarEventos(outro.id, sessionId, [])).rejects.toThrow("Sessão não encontrada");
  });

  it("resolver conflito pelo dispositivo não reescreve série de exercício interrompido", async () => {
    // A regra é do módulo `outbox` (`aplicarRegistroSerie` ignora
    // exercício interrompido) e precisa valer também quando a
    // aplicação vem da resolução manual de conflito, não só da fila.
    // Com o código antigo (map manual sem checar `interrompido`),
    // resolver pelo dispositivo sobrescreveria a série com os valores
    // do aparelho mesmo o exercício já tendo sido substituído.
    const { userId, sessionId } = await contexto();
    await registrarSerie(userId, sessionId, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 40, repeticoes: 10, rir: 2 });

    const offline = evento(sessionId, 1, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 60, repeticoes: 6, rir: 0 });
    const { conflitos } = await sincronizarEventos(userId, sessionId, [offline]);

    // O exercício foi interrompido (troca no meio da execução) depois
    // do registro online e antes da resolução do conflito.
    const [linha] = await db.select().from(workoutSessions).where(eq(workoutSessions.id, sessionId)).limit(1);
    const exercicios = (linha!.exercicios as ExercicioSessao[]).map((exercicio) =>
      exercicio.exercicioId === "supino-reto-halteres" ? { ...exercicio, interrompido: true } : exercicio);
    await db.update(workoutSessions).set({ exercicios }).where(eq(workoutSessions.id, sessionId));

    await resolverConflito(userId, conflitos[0]!.id, "dispositivo");

    // Nada muda: o exercício interrompido não recebe a escrita, e a
    // série continua com o valor gravado online (servidor), não o do
    // dispositivo.
    const serie = (await obterSessao(userId, sessionId))?.exercicios[0]?.series[0];
    expect(serie).toEqual(expect.objectContaining({ cargaKg: 40, repeticoes: 10, rir: 2 }));
  });
});
