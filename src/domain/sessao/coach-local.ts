import type { ExercicioSessao, SerieSessao } from "./repositorio";

/**
 * Coach Local.
 *
 * Offline, o Copiloto de Sessão sai do ar e este pacote assume. Ele é
 * determinístico, versionado e auditável: dadas as mesmas séries, dá
 * sempre a mesma orientação, e cada orientação carrega a regra que a
 * produziu. Isso é o oposto de "IA degradada" — não há geração, não há
 * variabilidade, e a UI é obrigada a rotular a origem como regra local.
 *
 * O escopo se limita a **decisões de baixo risco**: ajuste de carga
 * dentro de uma faixa estreita, descanso e alerta de parar.
 * Progressão de bloco, mudança de plano e qualquer leitura de dor
 * continuam sendo decisão do servidor ou do humano.
 */

export const COACH_LOCAL_VERSAO = "coach-local-v1";

export type RegraCoachLocal =
  | "carga-primeira-serie"
  | "carga-rir-alto"
  | "carga-rir-baixo"
  | "carga-manter"
  | "descanso-prescrito"
  | "cautela-falha-repetida";

export type Severidade = "informativa" | "cautela";

export interface OrientacaoLocal {
  regra: RegraCoachLocal;
  versao: typeof COACH_LOCAL_VERSAO;
  /** Sempre "regra local": offline nada simula IA. */
  origem: "regra local";
  severidade: Severidade;
  mensagem: string;
  /** Presente quando a regra sugere um valor de carga para a próxima série. */
  cargaSugeridaKg?: number;
}

/** Passo mínimo de anilha considerado; evita sugerir 41,3 kg. */
const PASSO_KG = 2.5;

function arredondar(kg: number): number {
  return Math.max(0, Math.round(kg / PASSO_KG) * PASSO_KG);
}

function orientacao(regra: RegraCoachLocal, mensagem: string, extra: Partial<OrientacaoLocal> = {}): OrientacaoLocal {
  return { regra, versao: COACH_LOCAL_VERSAO, origem: "regra local", severidade: "informativa", mensagem, ...extra };
}

function repeticoesMinimas(sugeridas: string): number {
  const numeros = sugeridas.match(/\d+/g)?.map(Number) ?? [];
  return numeros.length > 0 ? Math.min(...numeros) : 0;
}

/**
 * Ajuste de carga para a próxima série, a partir do RIR relatado na
 * anterior. A faixa é estreita de propósito: ±5% muda o estímulo sem
 * mudar o exercício, e é reversível na série seguinte.
 */
export function sugerirCarga(exercicio: ExercicioSessao, proximaSerie: SerieSessao): OrientacaoLocal {
  const anteriores = exercicio.series.filter((serie) => serie.concluida && serie.numero < proximaSerie.numero);
  const ultima = anteriores.at(-1);

  if (!ultima || ultima.cargaKg === null) {
    return orientacao("carga-primeira-serie",
      `Comece com ${arredondar(proximaSerie.cargaSugeridaKg)} kg, sua referência para este exercício.`,
      { cargaSugeridaKg: arredondar(proximaSerie.cargaSugeridaKg) });
  }

  const alvoRir = proximaSerie.rirPrescrito ?? proximaSerie.rir;
  const folga = ultima.rir - alvoRir;

  if (folga >= 2) {
    const carga = arredondar(ultima.cargaKg * 1.05);
    return orientacao("carga-rir-alto",
      `A série anterior parou com RIR ${ultima.rir}, acima do alvo ${alvoRir}. Suba para ${carga} kg.`,
      { cargaSugeridaKg: carga });
  }
  if (folga <= -2) {
    const carga = arredondar(ultima.cargaKg * 0.95);
    return orientacao("carga-rir-baixo",
      `A série anterior chegou a RIR ${ultima.rir}, abaixo do alvo ${alvoRir}. Reduza para ${carga} kg.`,
      { cargaSugeridaKg: carga });
  }
  return orientacao("carga-manter",
    `Mantenha ${arredondar(ultima.cargaKg)} kg: a série anterior ficou no alvo de RIR ${alvoRir}.`,
    { cargaSugeridaKg: arredondar(ultima.cargaKg) });
}

/**
 * Alerta de parar. Duas séries seguidas abaixo da faixa mínima de
 * repetições com RIR 0 indicam falha técnica acumulada; a orientação
 * é de cautela, nunca de bloqueio — o Bloqueio de Alto Risco depende
 * de classificação de segurança que não roda offline.
 */
export function avaliarCautela(exercicio: ExercicioSessao): OrientacaoLocal | null {
  const feitas = exercicio.series.filter((serie) => serie.concluida);
  const ultimas = feitas.slice(-2);
  if (ultimas.length < 2) return null;
  const minimo = repeticoesMinimas(ultimas[0].repeticoesSugeridas);
  const falhou = ultimas.every((serie) => serie.rir === 0 && (serie.repeticoes ?? 0) < minimo);
  if (!falhou) return null;
  return orientacao("cautela-falha-repetida",
    "Duas séries seguidas abaixo da faixa e sem reserva. Reduza a carga ou encerre este exercício.",
    { severidade: "cautela" });
}

export function orientarDescanso(exercicio: ExercicioSessao): OrientacaoLocal {
  return orientacao("descanso-prescrito",
    `Descanse ${exercicio.descansoSeg}s antes da próxima série, como prescrito no plano.`);
}

/**
 * Orientações para o exercício em foco, na ordem em que a tela deve
 * exibi-las. Cautela vem primeiro: se há motivo para parar, ele
 * precede qualquer sugestão de carga.
 */
export function orientarExercicio(exercicio: ExercicioSessao): OrientacaoLocal[] {
  if (exercicio.interrompido) return [];
  const proxima = exercicio.series.find((serie) => !serie.concluida);
  const cautela = avaliarCautela(exercicio);
  if (!proxima) return cautela ? [cautela] : [];
  return [cautela, sugerirCarga(exercicio, proxima), orientarDescanso(exercicio)].filter((o): o is OrientacaoLocal => o !== null);
}
