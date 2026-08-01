import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { mesclarEventos, ordenarEventos, type EstadoLocalSessao, type EventoOutbox } from "../outbox";

function estadoInicial(seriesPorExercicio = 3): EstadoLocalSessao {
  return {
    estado: "em_andamento",
    motivoAbandono: null,
    exercicios: [{
      exercicioId: "supino-reto-halteres",
      nome: "Supino reto com halteres",
      descansoSeg: 90,
      series: Array.from({ length: seriesPorExercicio }, (_, i) => ({
        numero: i + 1, repeticoesSugeridas: "8–10", cargaKg: null, cargaSugeridaKg: 20,
        melhorCargaAnteriorKg: 20, repeticoes: null, rir: 2, concluida: false,
      })),
    }],
  };
}

function evento(numero: number, extra: Partial<EventoOutbox> = {}): EventoOutbox {
  return {
    id: `evt-${numero}`,
    sessionId: "s1",
    tipo: "serie_registrada",
    ocorridoEm: new Date(1_700_000_000_000 + numero * 1000).toISOString(),
    ordem: numero,
    dados: { exercicioId: "supino-reto-halteres", numero, cargaKg: 40, repeticoes: 10, rir: 2 },
    ...extra,
  };
}

describe("merge idempotente do outbox", () => {
  it("aplica as séries registradas offline sobre o estado do servidor", () => {
    const { estado, aplicados, conflitos } = mesclarEventos(estadoInicial(), [evento(1), evento(2)]);
    expect(aplicados).toEqual(["evt-1", "evt-2"]);
    expect(conflitos).toEqual([]);
    expect(estado.exercicios[0].series.filter((s) => s.concluida)).toHaveLength(2);
    expect(estado.exercicios[0].series[0]).toMatchObject({ cargaKg: 40, repeticoes: 10, concluida: true });
  });

  it("reconhece reenvio da fila como duplicata em vez de aplicar de novo", () => {
    const primeiro = mesclarEventos(estadoInicial(), [evento(1)]);
    const segundo = mesclarEventos(primeiro.estado, [evento(1)], new Set(primeiro.aplicados));
    expect(segundo.duplicados).toEqual(["evt-1"]);
    expect(segundo.aplicados).toEqual([]);
    expect(segundo.estado).toEqual(primeiro.estado);
  });

  it("escala divergência de valores da mesma série para decisão humana", () => {
    const primeiro = mesclarEventos(estadoInicial(), [evento(1)]);
    const divergente = evento(1, { id: "evt-outro", dados: { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 60, repeticoes: 6, rir: 1 } });
    const segundo = mesclarEventos(primeiro.estado, [divergente]);

    expect(segundo.aplicados).toEqual([]);
    expect(segundo.conflitos).toEqual([{
      eventoId: "evt-outro",
      motivo: "serie_divergente",
      servidor: { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 40, repeticoes: 10, rir: 2 },
      dispositivo: { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 60, repeticoes: 6, rir: 1 },
    }]);
    // Nada é descartado silenciosamente: o servidor mantém o que tinha.
    expect(segundo.estado.exercicios[0].series[0].cargaKg).toBe(40);
  });

  it("trata série que não existe no plano do servidor como conflito, não como perda", () => {
    const fora = evento(9, { dados: { exercicioId: "remada-curvada", numero: 1, cargaKg: 50, repeticoes: 8, rir: 2 } });
    const { conflitos, estado } = mesclarEventos(estadoInicial(), [fora]);
    expect(conflitos[0]).toMatchObject({ motivo: "serie_divergente", servidor: { existe: false } });
    expect(estado.exercicios[0].series.every((s) => !s.concluida)).toBe(true);
  });

  it("encerra a sessão pelo evento offline e aceita reenvio idêntico", () => {
    const concluir = evento(4, { id: "fim", tipo: "sessao_concluida", dados: {} });
    const primeiro = mesclarEventos(estadoInicial(), [concluir]);
    expect(primeiro.estado.estado).toBe("concluida");
    const segundo = mesclarEventos(primeiro.estado, [concluir]);
    expect(segundo.conflitos).toEqual([]);
    expect(segundo.estado.estado).toBe("concluida");
  });

  it("escala encerramento divergente sobre sessão já encerrada", () => {
    const concluida = mesclarEventos(estadoInicial(), [evento(4, { id: "fim", tipo: "sessao_concluida", dados: {} })]).estado;
    const abandono = evento(5, { id: "abandono", tipo: "sessao_abandonada", dados: { motivo: "dor" } });
    const { conflitos } = mesclarEventos(concluida, [abandono]);
    expect(conflitos[0]).toMatchObject({ motivo: "sessao_ja_encerrada", servidor: { estado: "concluida" } });
  });
});

const eventoArb = (total: number) => fc.record({
  numero: fc.integer({ min: 1, max: total }),
  cargaKg: fc.integer({ min: 0, max: 200 }),
  repeticoes: fc.integer({ min: 1, max: 20 }),
  rir: fc.integer({ min: 0, max: 5 }),
  ordem: fc.integer({ min: 1, max: 50 }),
}).map(({ numero, cargaKg, repeticoes, rir, ordem }): EventoOutbox => ({
  id: `s-${numero}`,
  sessionId: "s1",
  tipo: "serie_registrada",
  ocorridoEm: new Date(1_700_000_000_000 + ordem * 1000).toISOString(),
  ordem,
  dados: { exercicioId: "supino-reto-halteres", numero, cargaKg, repeticoes, rir },
}));

describe("propriedades do merge", () => {
  const total = 4;
  // Um id por série: evita gerar dois eventos distintos para a mesma
  // série, que é conflito legítimo e não deve ser confundido com falha
  // de idempotência.
  const loteArb = fc.uniqueArray(eventoArb(total), { minLength: 0, maxLength: 8, selector: (e) => e.id });

  it("reaplicar o mesmo lote não muda o estado nem cria conflito", () => {
    fc.assert(fc.property(loteArb, (eventos) => {
      const primeira = mesclarEventos(estadoInicial(total), eventos);
      const segunda = mesclarEventos(primeira.estado, eventos, new Set(primeira.aplicados));
      expect(segunda.estado).toEqual(primeira.estado);
      expect(segunda.conflitos).toEqual([]);
      expect(segunda.aplicados).toEqual([]);
    }));
  });

  it("a ordem de chegada do lote não altera o estado final", () => {
    fc.assert(fc.property(loteArb, fc.integer(), (eventos, semente) => {
      const embaralhado = [...eventos].sort((a, b) => ((Date.parse(a.ocorridoEm) + semente) % 7) - ((Date.parse(b.ocorridoEm) + semente) % 7));
      expect(mesclarEventos(estadoInicial(total), embaralhado).estado)
        .toEqual(mesclarEventos(estadoInicial(total), eventos).estado);
    }));
  });

  it("sincronizar em pedaços equivale a sincronizar de uma vez", () => {
    fc.assert(fc.property(loteArb, fc.nat(), (eventos, corte) => {
      const ordenados = ordenarEventos(eventos);
      const ponto = eventos.length === 0 ? 0 : corte % (ordenados.length + 1);
      const primeiro = mesclarEventos(estadoInicial(total), ordenados.slice(0, ponto));
      const segundo = mesclarEventos(primeiro.estado, ordenados.slice(ponto), new Set(primeiro.aplicados));
      expect(segundo.estado).toEqual(mesclarEventos(estadoInicial(total), ordenados).estado);
    }));
  });

  it("nenhum evento some: todo id vira aplicado, duplicado ou conflito", () => {
    fc.assert(fc.property(loteArb, (eventos) => {
      const { aplicados, duplicados, conflitos } = mesclarEventos(estadoInicial(total), eventos);
      const contabilizados = new Set([...aplicados, ...duplicados, ...conflitos.map((c) => c.eventoId)]);
      expect(contabilizados.size).toBe(new Set(eventos.map((e) => e.id)).size);
    }));
  });
});
