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

/**
 * Recusa sem resolução humana possível: `rir` 47 ou `cargaKg` que não
 * é número não são decisão do atleta, são defeito do nosso próprio
 * cliente. Por isso viram sinal de observabilidade e não linha na tela
 * de conflitos — pedir ao atleta que escolha entre dois valores em que
 * um deles é impossível não é uma pergunta que ele possa responder.
 */
export type MotivoInadmissivel = "forma_invalida" | "valor_fora_de_faixa";

export interface RegistroInadmissivel {
  eventoId: string;
  motivo: MotivoInadmissivel;
}

/**
 * O que fazer com um registro de série proposto. É a única definição
 * de *o que é um registro admissível e quando ele pode ser aplicado*:
 * tanto a fila offline quanto a escrita online perguntam aqui, em vez
 * de cada caminho carregar a própria cópia das regras.
 */
export type VereditoRegistroSerie =
  | { situacao: "aplicavel"; registro: SerieRegistrada }
  | { situacao: "conflito"; motivo: MotivoConflito; servidor: Record<string, unknown>; dispositivo: Record<string, unknown> }
  | { situacao: "inadmissivel"; motivo: MotivoInadmissivel };

const RIR_MAXIMO = 10;

function numeroFinito(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

/** Forma de um `serie_registrada`, conferida uma vez e consumida pelos dois caminhos de escrita. */
function lerRegistro(dados: Record<string, unknown>): SerieRegistrada | null {
  const { exercicioId, numero, cargaKg, repeticoes, rir } = dados;
  if (typeof exercicioId !== "string" || !numeroFinito(numero)) return null;
  if (!numeroFinito(cargaKg) || !numeroFinito(repeticoes) || !numeroFinito(rir)) return null;
  return { exercicioId, numero, cargaKg, repeticoes, rir };
}

/**
 * Veredito sobre um registro de série contra o estado persistido da
 * sessão.
 *
 * A ordem importa: forma e faixa vêm antes do estado porque um dado
 * impossível não vira pergunta para o atleta, e o estado vem antes da
 * comparação com a série gravada porque uma sessão encerrada não
 * aceita registro novo, iguais ou não.
 */
export function avaliarRegistroSerie(estado: EstadoLocalSessao, dados: Record<string, unknown>): VereditoRegistroSerie {
  const registro = lerRegistro(dados);
  if (!registro) return { situacao: "inadmissivel", motivo: "forma_invalida" };
  if (registro.cargaKg < 0 || registro.repeticoes < 0 || registro.rir < 0 || registro.rir > RIR_MAXIMO) {
    return { situacao: "inadmissivel", motivo: "valor_fora_de_faixa" };
  }

  if (estado.estado !== "em_andamento") {
    // O atleta de fato executou esta série: não é recusa silenciosa, é
    // divergência legítima que um humano resolve depois.
    return { situacao: "conflito", motivo: "sessao_ja_encerrada", servidor: { estado: estado.estado }, dispositivo: { ...registro } };
  }

  const exercicio = estado.exercicios.find((item) => item.exercicioId === registro.exercicioId && !item.interrompido);
  const serie = exercicio?.series.find((item) => item.numero === registro.numero);
  if (!serie) {
    // Série que não existe no plano do servidor: o dispositivo estava
    // com outra versão da sessão. Não inventamos a série nem jogamos
    // fora o registro do atleta.
    return { situacao: "conflito", motivo: "serie_divergente", servidor: { existe: false }, dispositivo: { ...registro } };
  }
  if (serie.concluida && !mesmaSerie(serie, registro)) {
    return {
      situacao: "conflito", motivo: "serie_divergente",
      // A identificação da série viaja nos dois lados: o conflito é
      // persistido e resolvido depois, possivelmente noutra sessão do
      // app, quando o evento original já não está à mão.
      servidor: { exercicioId: registro.exercicioId, numero: registro.numero, cargaKg: serie.cargaKg, repeticoes: serie.repeticoes, rir: serie.rir },
      dispositivo: { ...registro },
    };
  }
  return { situacao: "aplicavel", registro };
}

/** Aplica um registro já julgado aplicável. */
export function aplicarRegistroSerie(estado: EstadoLocalSessao, registro: SerieRegistrada): EstadoLocalSessao {
  return {
    ...estado,
    exercicios: estado.exercicios.map((exercicio) => {
      if (exercicio.exercicioId !== registro.exercicioId || exercicio.interrompido) return exercicio;
      return {
        ...exercicio,
        series: exercicio.series.map((serie) =>
          serie.numero === registro.numero
            ? { ...serie, cargaKg: registro.cargaKg, repeticoes: registro.repeticoes, rir: registro.rir, concluida: true }
            : serie),
      };
    }),
  };
}

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
  /** Eventos recusados por defeito do cliente. Vão para observabilidade, não para a tela. */
  inadmissiveis: RegistroInadmissivel[];
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
  const veredito = avaliarRegistroSerie(estado, evento.dados);
  if (veredito.situacao === "inadmissivel") {
    resultado.inadmissiveis.push({ eventoId: evento.id, motivo: veredito.motivo });
    return estado;
  }
  if (veredito.situacao === "conflito") {
    resultado.conflitos.push({
      eventoId: evento.id, motivo: veredito.motivo,
      servidor: veredito.servidor, dispositivo: veredito.dispositivo,
    });
    return estado;
  }
  resultado.aplicados.push(evento.id);
  return aplicarRegistroSerie(estado, veredito.registro);
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
  const resultado: ResultadoMerge = { estado: inicial, aplicados: [], duplicados: [], conflitos: [], inadmissiveis: [] };
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
