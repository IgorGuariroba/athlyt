import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { plans, users } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import type { EventoOutbox } from "../outbox";
import { iniciarSessao, obterSessao, registrarSerie } from "../repositorio";
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
    userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo", regraVersao: plano.regraVersao,
    modoConservador: false, conteudo: plano, activatedAt: new Date(),
  });
  const sessao = await iniciarSessao(user.id, "segunda-superior");
  return { userId: user.id, sessionId: sessao.id };
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
    expect(sessao?.exercicios[0].series.filter((s) => s.concluida)).toHaveLength(2);
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
    expect(sessao?.exercicios[0].series.map((s) => s.cargaKg)).toEqual([30, 32]);
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
    expect((await obterSessao(userId, sessionId))?.exercicios[0].series[0].cargaKg).toBe(40);

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

    await resolverConflito(userId, conflitos[0].id, "dispositivo");

    expect((await obterSessao(userId, sessionId))?.exercicios[0].series[0]).toMatchObject({ cargaKg: 60, repeticoes: 6, rir: 0 });
    expect(await listarConflitosPendentes(userId)).toEqual([]);
    await expect(resolverConflito(userId, conflitos[0].id, "servidor")).rejects.toThrow("já resolvido");
  });

  it("resolve conflito pelo servidor preservando o estado gravado", async () => {
    const { userId, sessionId } = await contexto();
    await registrarSerie(userId, sessionId, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 40, repeticoes: 10, rir: 2 });
    const offline = evento(sessionId, 1, { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 60, repeticoes: 6, rir: 0 });
    const { conflitos } = await sincronizarEventos(userId, sessionId, [offline]);

    await resolverConflito(userId, conflitos[0].id, "servidor");
    expect((await obterSessao(userId, sessionId))?.exercicios[0].series[0].cargaKg).toBe(40);
    expect(await listarConflitosPendentes(userId)).toEqual([]);
  });

  it("recusa fila de sessão de outro usuário", async () => {
    const { sessionId } = await contexto();
    const [outro] = await db.insert(users).values({ email: `intruso-${randomUUID()}@example.com` }).returning();
    await expect(sincronizarEventos(outro.id, sessionId, [])).rejects.toThrow("Sessão não encontrada");
  });
});
