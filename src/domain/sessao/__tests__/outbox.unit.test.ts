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
        repeticoes: null, rir: 2, concluida: false,
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
    expect(estado.exercicios[0]!.series.filter((s) => s.concluida)).toHaveLength(2);
    expect(estado.exercicios[0]!.series[0]).toMatchObject({ cargaKg: 40, repeticoes: 10, concluida: true });
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
    expect(segundo.estado.exercicios[0]!.series[0]!.cargaKg).toBe(40);
  });

  it("trata série que não existe no plano do servidor como conflito, não como perda", () => {
    const fora = evento(9, { dados: { exercicioId: "remada-curvada", numero: 1, cargaKg: 50, repeticoes: 8, rir: 2 } });
    const { conflitos, estado } = mesclarEventos(estadoInicial(), [fora]);
    expect(conflitos[0]).toMatchObject({ motivo: "serie_divergente", servidor: { existe: false } });
    expect(estado.exercicios[0]!.series.every((s) => !s.concluida)).toBe(true);
  });

  it("encerra a sessão pelo evento offline e aceita reenvio idêntico", () => {
    const concluir = evento(4, { id: "fim", tipo: "sessao_concluida", dados: {} });
    const primeiro = mesclarEventos(estadoInicial(), [concluir]);
    expect(primeiro.estado.estado).toBe("concluida");
    const segundo = mesclarEventos(primeiro.estado, [concluir]);
    expect(segundo.conflitos).toEqual([]);
    expect(segundo.estado.estado).toBe("concluida");
  });

  it("escala para conflito a série registrada depois do encerramento", () => {
    // O caso de um aparelho só: o atleta encerra offline e registra
    // mais uma série. A série tem ordem maior, então chega depois do
    // encerramento — e não pode entrar em silêncio numa sessão
    // concluída, porque o resumo e as cargas sugeridas derivam dela.
    const fim = evento(4, { id: "fim", tipo: "sessao_concluida", dados: {} });
    const tardia = evento(5, { id: "tardia", dados: { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 40, repeticoes: 10, rir: 2 } });

    const { estado, aplicados, conflitos } = mesclarEventos(estadoInicial(), [tardia, fim]);

    expect(aplicados).toEqual(["fim"]);
    expect(estado.estado).toBe("concluida");
    expect(estado.exercicios[0]!.series.every((s) => !s.concluida)).toBe(true);
    expect(conflitos).toEqual([{
      eventoId: "tardia",
      motivo: "sessao_ja_encerrada",
      servidor: { estado: "concluida" },
      dispositivo: { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 40, repeticoes: 10, rir: 2 },
    }]);
  });

  it("recusa como inadmissível o registro fora de faixa, sem pedir decisão ao atleta", () => {
    const forjado = evento(1, { id: "ruim", dados: { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 40, repeticoes: 10, rir: 47 } });

    const { estado, aplicados, conflitos, inadmissiveis } = mesclarEventos(estadoInicial(), [forjado]);

    expect(aplicados).toEqual([]);
    expect(conflitos).toEqual([]);
    expect(inadmissiveis).toEqual([{ eventoId: "ruim", motivo: "valor_fora_de_faixa" }]);
    expect(estado.exercicios[0]!.series[0]!.concluida).toBe(false);
  });

  it("recusa como inadmissível o registro com campo de tipo errado", () => {
    const forjado = evento(1, { id: "ruim", dados: { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: "40", repeticoes: 10, rir: 2 } });
    const { inadmissiveis, aplicados } = mesclarEventos(estadoInicial(), [forjado]);
    expect(aplicados).toEqual([]);
    expect(inadmissiveis).toEqual([{ eventoId: "ruim", motivo: "forma_invalida" }]);
  });

  it("escala encerramento divergente sobre sessão já encerrada", () => {
    const concluida = mesclarEventos(estadoInicial(), [evento(4, { id: "fim", tipo: "sessao_concluida", dados: {} })]).estado;
    const abandono = evento(5, { id: "abandono", tipo: "sessao_abandonada", dados: { motivo: "dor" } });
    const { conflitos } = mesclarEventos(concluida, [abandono]);
    expect(conflitos[0]).toMatchObject({ motivo: "sessao_ja_encerrada", servidor: { estado: "concluida" } });
  });
});

describe("correção de série registrada", () => {
  function correcao(numero: number, extra: Partial<EventoOutbox> = {}): EventoOutbox {
    return {
      id: `corr-${numero}`,
      sessionId: "s1",
      tipo: "serie_corrigida",
      ocorridoEm: new Date(1_700_000_000_000 + numero * 1000).toISOString(),
      ordem: numero + 100,
      dados: { exercicioId: "supino-reto-halteres", numero, cargaKg: 56, repeticoes: 10, rir: 2, anterior: { cargaKg: 48, repeticoes: 10, rir: 2 } },
      ...extra,
    };
  }

  function estadoComSerieRegistrada(dados = { cargaKg: 48, repeticoes: 10, rir: 2 }): EstadoLocalSessao {
    return mesclarEventos(estadoInicial(), [evento(1, { dados: { exercicioId: "supino-reto-halteres", numero: 1, ...dados } })]).estado;
  }

  it("corrige os valores mantendo a série concluída", () => {
    const { estado, aplicados, conflitos } = mesclarEventos(estadoComSerieRegistrada(), [correcao(1)]);
    expect(aplicados).toEqual(["corr-1"]);
    expect(conflitos).toEqual([]);
    expect(estado.exercicios[0]!.series[0]).toMatchObject({ cargaKg: 56, repeticoes: 10, rir: 2, concluida: true });
  });

  it("corrige série de exercício interrompido sem reativá-lo", () => {
    const registrado = mesclarEventos(estadoInicial(), [evento(1, { dados: { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 48, repeticoes: 10, rir: 2 } })]).estado;
    const interrompido = { ...registrado, exercicios: registrado.exercicios.map((e) => ({ ...e, interrompido: true as const, motivoSubstituicao: "dor" as const })) };
    const { estado, aplicados, conflitos } = mesclarEventos(interrompido, [correcao(1)]);
    expect(aplicados).toEqual(["corr-1"]);
    expect(conflitos).toEqual([]);
    expect(estado.exercicios[0]!.series[0]).toMatchObject({ cargaKg: 56, concluida: true });
    expect(estado.exercicios[0]!.interrompido).toBe(true);
  });

  it("escala para conflito a edição concorrente de outro aparelho", () => {
    // O servidor já tem 60 kg (outro aparelho corrigiu antes); este
    // aparelho viu 48 kg ao editar. Sobrescrever em silêncio perderia
    // a correção do primeiro.
    const servidor = mesclarEventos(estadoComSerieRegistrada(), [correcao(1, { id: "outro-aparelho", dados: { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 60, repeticoes: 10, rir: 2, anterior: { cargaKg: 48, repeticoes: 10, rir: 2 } } })]).estado;
    const { estado, aplicados, conflitos } = mesclarEventos(servidor, [correcao(1)]);

    expect(aplicados).toEqual([]);
    expect(conflitos).toEqual([{
      eventoId: "corr-1",
      motivo: "serie_divergente",
      servidor: { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 60, repeticoes: 10, rir: 2 },
      dispositivo: { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 56, repeticoes: 10, rir: 2, anterior: { cargaKg: 48, repeticoes: 10, rir: 2 } },
    }]);
    expect(estado.exercicios[0]!.series[0]!.cargaKg).toBe(60);
  });

  it("reconhece a mesma correção reenviada como aplicável sem mudar o estado", () => {
    const primeiro = mesclarEventos(estadoComSerieRegistrada(), [correcao(1)]);
    const segundo = mesclarEventos(primeiro.estado, [correcao(1)], new Set(primeiro.aplicados));
    expect(segundo.duplicados).toEqual(["corr-1"]);
    expect(segundo.estado).toEqual(primeiro.estado);
  });

  it("escala para conflito a correção de série não concluída", () => {
    const { conflitos, estado } = mesclarEventos(estadoInicial(), [correcao(1)]);
    expect(conflitos[0]).toMatchObject({ motivo: "serie_divergente", servidor: { existe: false } });
    expect(estado.exercicios[0]!.series[0]!.concluida).toBe(false);
  });

  it("escala para conflito a correção sobre sessão encerrada", () => {
    const encerrada = { ...estadoComSerieRegistrada(), estado: "concluida" as const };
    const { aplicados, conflitos } = mesclarEventos(encerrada, [correcao(1)]);
    expect(aplicados).toEqual([]);
    expect(conflitos[0]).toMatchObject({ motivo: "sessao_ja_encerrada", servidor: { estado: "concluida" } });
  });

  it("recusa como inadmissível a correção sem o valor anterior", () => {
    const semAnterior = correcao(1, { dados: { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 56, repeticoes: 10, rir: 2 } });
    const { inadmissiveis, aplicados, conflitos } = mesclarEventos(estadoComSerieRegistrada(), [semAnterior]);
    expect(aplicados).toEqual([]);
    expect(conflitos).toEqual([]);
    expect(inadmissiveis).toEqual([{ eventoId: "corr-1", motivo: "forma_invalida" }]);
  });

  it("registra a série e corrige no mesmo lote offline", () => {
    // Registro e correção partem do mesmo aparelho sem rede: a correção
    // tem ordem maior e o `anterior` é o valor recém-registrado.
    const { estado, aplicados, conflitos } = mesclarEventos(estadoInicial(), [evento(1, { dados: { exercicioId: "supino-reto-halteres", numero: 1, cargaKg: 48, repeticoes: 10, rir: 2 } }), correcao(1)]);
    expect(aplicados).toEqual(["evt-1", "corr-1"]);
    expect(conflitos).toEqual([]);
    expect(estado.exercicios[0]!.series[0]).toMatchObject({ cargaKg: 56, repeticoes: 10, rir: 2, concluida: true });
  });
});

/**
 * Gera o que o servidor de fato recebe, e não só o que um cliente
 * correto envia: carga negativa, `rir` fora de faixa e campo com tipo
 * errado atravessam a rede como qualquer outro evento. Com geradores
 * bem-comportados, as invariantes não podiam ser violadas *por
 * construção do teste*, e a lacuna ficava invisível aqui.
 */
const eventoArb = (total: number) => fc.record({
  numero: fc.integer({ min: 1, max: total }),
  cargaKg: fc.oneof(fc.integer({ min: -50, max: 200 }), fc.constant("40")),
  repeticoes: fc.integer({ min: -5, max: 20 }),
  rir: fc.integer({ min: -3, max: 47 }),
  ordem: fc.integer({ min: 1, max: 50 }),
}).map(({ numero, cargaKg, repeticoes, rir, ordem }): EventoOutbox => ({
  id: `s-${numero}`,
  sessionId: "s1",
  tipo: "serie_registrada",
  ocorridoEm: new Date(1_700_000_000_000 + ordem * 1000).toISOString(),
  ordem,
  dados: { exercicioId: "supino-reto-halteres", numero, cargaKg, repeticoes, rir },
}));

/** Nem toda sessão do servidor está aberta quando a fila chega. */
const estadoInicialArb = (total: number) => fc
  .constantFrom<EstadoLocalSessao["estado"]>("em_andamento", "concluida", "abandonada")
  .map((estado) => ({ ...estadoInicial(total), estado }));

describe("propriedades do merge", () => {
  const total = 4;
  // Um id por série: evita gerar dois eventos distintos para a mesma
  // série, que é conflito legítimo e não deve ser confundido com falha
  // de idempotência.
  const loteArb = fc.uniqueArray(eventoArb(total), { minLength: 0, maxLength: 8, selector: (e) => e.id });

  it("reaplicar o mesmo lote não muda o estado nem cria conflito", () => {
    fc.assert(fc.property(loteArb, estadoInicialArb(total), (eventos, inicial) => {
      const primeira = mesclarEventos(inicial, eventos);
      // O servidor reconhece como já processado tanto o que aplicou
      // quanto o conflito que persistiu — é o que `sincronizarEventos`
      // monta a partir de `workoutEvents` e dos conflitos abertos.
      const processados = new Set([...primeira.aplicados, ...primeira.conflitos.map((c) => c.eventoId)]);
      const segunda = mesclarEventos(primeira.estado, eventos, processados);
      expect(segunda.estado).toEqual(primeira.estado);
      expect(segunda.conflitos).toEqual([]);
      expect(segunda.aplicados).toEqual([]);
    }));
  });

  it("a ordem de chegada do lote não altera o estado final", () => {
    fc.assert(fc.property(loteArb, estadoInicialArb(total), fc.integer(), (eventos, inicial, semente) => {
      const embaralhado = [...eventos].sort((a, b) => ((Date.parse(a.ocorridoEm) + semente) % 7) - ((Date.parse(b.ocorridoEm) + semente) % 7));
      expect(mesclarEventos(inicial, embaralhado).estado)
        .toEqual(mesclarEventos(inicial, eventos).estado);
    }));
  });

  it("sincronizar em pedaços equivale a sincronizar de uma vez", () => {
    fc.assert(fc.property(loteArb, estadoInicialArb(total), fc.nat(), (eventos, inicial, corte) => {
      const ordenados = ordenarEventos(eventos);
      const ponto = eventos.length === 0 ? 0 : corte % (ordenados.length + 1);
      const primeiro = mesclarEventos(inicial, ordenados.slice(0, ponto));
      const segundo = mesclarEventos(primeiro.estado, ordenados.slice(ponto), new Set(primeiro.aplicados));
      expect(segundo.estado).toEqual(mesclarEventos(inicial, ordenados).estado);
    }));
  });

  it("nenhum evento some: todo id vira aplicado, duplicado, conflito ou inadmissível", () => {
    fc.assert(fc.property(loteArb, estadoInicialArb(total), (eventos, inicial) => {
      const { aplicados, duplicados, conflitos, inadmissiveis } = mesclarEventos(inicial, eventos);
      const contabilizados = new Set([
        ...aplicados, ...duplicados,
        ...conflitos.map((c) => c.eventoId), ...inadmissiveis.map((r) => r.eventoId),
      ]);
      expect(contabilizados.size).toBe(new Set(eventos.map((e) => e.id)).size);
    }));
  });

  it("nenhum registro fora de faixa entra no estado, nem como conflito", () => {
    fc.assert(fc.property(loteArb, estadoInicialArb(total), (eventos, inicial) => {
      const { estado, inadmissiveis, conflitos } = mesclarEventos(inicial, eventos);
      const recusados = new Set(inadmissiveis.map((r) => r.eventoId));
      // O que é inadmissível não vira pergunta para o atleta.
      expect(conflitos.some((c) => recusados.has(c.eventoId))).toBe(false);
      for (const serie of estado.exercicios.flatMap((e) => e.series)) {
        if (!serie.concluida) continue;
        expect(serie.cargaKg).toBeGreaterThanOrEqual(0);
        expect(serie.repeticoes).toBeGreaterThanOrEqual(0);
        expect(serie.rir).toBeGreaterThanOrEqual(0);
        expect(serie.rir).toBeLessThanOrEqual(10);
      }
    }));
  });
});
