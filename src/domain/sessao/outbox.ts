import type { EstadoSessao, ExercicioSessao } from "./repositorio";

/**
 * Outbox de eventos da Sessão de Treino.
 *
 * O dispositivo é a autoridade sobre *o que aconteceu*: cada ação da
 * sessão vira um evento com identificador estável gerado localmente,
 * timestamp do aparelho e ordem lógica monotônica. O servidor é a
 * autoridade sobre *o que vale*, e reconcilia aplicando os eventos
 * sobre o estado persistido.
 *
 * Este módulo é deliberadamente puro: nada de banco, rede ou
 * IndexedDB. Assim, o merge idempotente offline pode ser testado
 * abaixo do seam principal, pois a matriz de ordens, duplicatas e
 * reenvios é grande demais para caber só em jornada.
 */

export type TipoEventoOutbox =
  | "sessao_iniciada"
  | "serie_registrada"
  | "exercicio_substituido"
  | "sessao_concluida"
  | "sessao_abandonada";

export interface SerieRegistrada {
  exercicioId: string;
  numero: number;
  cargaKg: number;
  repeticoes: number;
  rir: number;
}

export interface EventoOutbox {
  /** UUID gerado no dispositivo. É a chave de idempotência. */
  id: string;
  sessionId: string;
  tipo: TipoEventoOutbox;
  /** Timestamp do dispositivo, ISO-8601. Pode divergir do relógio do servidor. */
  ocorridoEm: string;
  /**
   * Ordem lógica no dispositivo: contador monotônico por sessão. É o
   * critério primário de ordenação porque o relógio local pode ser
   * ajustado no meio da sessão, e dois eventos podem compartilhar o
   * mesmo milissegundo.
   */
  ordem: number;
  dados: Record<string, unknown>;
}

export interface EstadoLocalSessao {
  estado: EstadoSessao;
  exercicios: ExercicioSessao[];
  motivoAbandono: string | null;
}

export type MotivoConflito = "serie_divergente" | "sessao_ja_encerrada";

export interface ConflitoSincronizacao {
  eventoId: string;
  motivo: MotivoConflito;
  /** O que já está gravado no servidor. */
  servidor: Record<string, unknown>;
  /** O que o evento offline afirma. */
  dispositivo: Record<string, unknown>;
}

export interface ResultadoMerge {
  estado: EstadoLocalSessao;
  /** IDs efetivamente aplicados nesta passada (exclui duplicatas). */
  aplicados: string[];
  /** IDs reconhecidos como já processados antes — reenvio benigno. */
  duplicados: string[];
  /**
   * Divergências que não dá para resolver com segurança. Não são
   * descartadas nem aplicadas: sobem para decisão humana.
   */
  conflitos: ConflitoSincronizacao[];
}

/**
 * Ordem determinística: (ordem lógica, timestamp, id). O id entra como
 * desempate final para que dois dispositivos — ou dois reenvios com
 * relógios diferentes — cheguem sempre ao mesmo resultado.
 */
export function ordenarEventos(eventos: readonly EventoOutbox[]): EventoOutbox[] {
  return [...eventos].sort((a, b) =>
    a.ordem - b.ordem ||
    Date.parse(a.ocorridoEm) - Date.parse(b.ocorridoEm) ||
    a.id.localeCompare(b.id));
}

function mesmaSerie(serie: { cargaKg: number | null; repeticoes: number | null; rir: number }, dados: SerieRegistrada): boolean {
  return serie.cargaKg === dados.cargaKg && serie.repeticoes === dados.repeticoes && serie.rir === dados.rir;
}

function aplicarSerie(estado: EstadoLocalSessao, evento: EventoOutbox, resultado: ResultadoMerge): EstadoLocalSessao {
  const dados = evento.dados as unknown as SerieRegistrada;
  const exercicios = estado.exercicios.map((exercicio) => {
    if (exercicio.exercicioId !== dados.exercicioId || exercicio.interrompido) return exercicio;
    return {
      ...exercicio,
      series: exercicio.series.map((serie) =>
        serie.numero === dados.numero
          ? { ...serie, cargaKg: dados.cargaKg, repeticoes: dados.repeticoes, rir: dados.rir, concluida: true }
          : serie),
    };
  });
  const antes = estado.exercicios.find((e) => e.exercicioId === dados.exercicioId && !e.interrompido)?.series.find((s) => s.numero === dados.numero);

  if (!antes) {
    // Série que não existe no plano do servidor: o dispositivo estava
    // com outra versão da sessão. Não inventamos a série nem jogamos
    // fora o registro do atleta.
    resultado.conflitos.push({
      eventoId: evento.id, motivo: "serie_divergente",
      servidor: { existe: false },
      dispositivo: { ...dados },
    });
    return estado;
  }
  if (antes.concluida && !mesmaSerie(antes, dados)) {
    resultado.conflitos.push({
      eventoId: evento.id, motivo: "serie_divergente",
      // A identificação da série viaja nos dois lados: o conflito é
      // persistido e resolvido depois, possivelmente noutra sessão do
      // app, quando o evento original já não está à mão.
      servidor: { exercicioId: dados.exercicioId, numero: dados.numero, cargaKg: antes.cargaKg, repeticoes: antes.repeticoes, rir: antes.rir },
      dispositivo: { exercicioId: dados.exercicioId, numero: dados.numero, cargaKg: dados.cargaKg, repeticoes: dados.repeticoes, rir: dados.rir },
    });
    return estado;
  }
  resultado.aplicados.push(evento.id);
  return { ...estado, exercicios };
}

function aplicarEncerramento(estado: EstadoLocalSessao, evento: EventoOutbox, resultado: ResultadoMerge): EstadoLocalSessao {
  const novoEstado: EstadoSessao = evento.tipo === "sessao_concluida" ? "concluida" : "abandonada";
  const motivo = evento.tipo === "sessao_abandonada" ? String(evento.dados.motivo ?? "outro") : null;

  if (estado.estado !== "em_andamento") {
    // Já encerrada do mesmo jeito: reenvio benigno, não é conflito.
    if (estado.estado === novoEstado && estado.motivoAbandono === motivo) {
      resultado.aplicados.push(evento.id);
      return estado;
    }
    resultado.conflitos.push({
      eventoId: evento.id, motivo: "sessao_ja_encerrada",
      servidor: { estado: estado.estado, motivoAbandono: estado.motivoAbandono },
      dispositivo: { estado: novoEstado, motivoAbandono: motivo },
    });
    return estado;
  }
  resultado.aplicados.push(evento.id);
  return { ...estado, estado: novoEstado, motivoAbandono: motivo };
}

/**
 * Aplica um lote de eventos sobre o estado do servidor.
 *
 * `jaAplicados` traz os IDs que o servidor já persistiu — é o que
 * torna o reenvio da fila inofensivo. Além disso, o merge é
 * idempotente *por construção*: registrar a mesma série com os mesmos
 * valores duas vezes leva ao mesmo estado, mesmo que o histórico de
 * IDs se perca.
 */
export function mesclarEventos(
  inicial: EstadoLocalSessao,
  eventos: readonly EventoOutbox[],
  jaAplicados: ReadonlySet<string> = new Set(),
): ResultadoMerge {
  const resultado: ResultadoMerge = { estado: inicial, aplicados: [], duplicados: [], conflitos: [] };
  const vistos = new Set(jaAplicados);
  let estado = inicial;

  for (const evento of ordenarEventos(eventos)) {
    if (vistos.has(evento.id)) {
      resultado.duplicados.push(evento.id);
      continue;
    }
    vistos.add(evento.id);
    switch (evento.tipo) {
      case "serie_registrada":
        estado = aplicarSerie(estado, evento, resultado);
        break;
      case "sessao_concluida":
      case "sessao_abandonada":
        estado = aplicarEncerramento(estado, evento, resultado);
        break;
      default:
        // `sessao_iniciada` e `exercicio_substituido` nascem no
        // servidor: a substituição exige revalidar alternativas contra
        // o perfil, o que o dispositivo offline não pode fazer sem
        // simular a decisão. Chegam aqui só como ruído de reenvio.
        resultado.duplicados.push(evento.id);
    }
  }
  resultado.estado = estado;
  return resultado;
}
