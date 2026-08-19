/**
 * Opções de descanso entre séries.
 *
 * O plano prescreve um descanso por exercício, mas quem está sob a
 * barra é quem sabe se o dia rende: falta de tempo pede um intervalo
 * mais curto, uma série pesada perto da falha pede um mais longo. Em
 * vez de um campo livre — que na prática vira um número digitado com
 * o dedo suado entre séries —, a escolha é entre **três opções
 * derivadas da própria prescrição**, para que o desvio continue
 * ancorado no que foi planejado e permaneça auditável.
 *
 * As opções são calculadas, e não fixas em 60/90/120: um descanso
 * prescrito de 180s num agachamento e outro de 60s numa elevação
 * lateral não podem oferecer a mesma escala. `curto` e `longo` são
 * proporções do prescrito, arredondadas para múltiplos de 15s (a
 * mesma granularidade dos botões ±15s do timer) e presas aos limites
 * que a prescrição de IA já respeita (30s a 300s).
 */

export type RitmoDescanso = "curto" | "prescrito" | "longo";

export const RITMO_PADRAO: RitmoDescanso = "prescrito";

/** Mesmos limites do schema de prescrição (`plano-inicial`). */
const MINIMO_SEG = 30;
const MAXIMO_SEG = 300;
const PASSO_SEG = 15;

const FATOR: Record<RitmoDescanso, number> = { curto: 2 / 3, prescrito: 1, longo: 1.5 };

export function ehRitmoDescanso(valor: unknown): valor is RitmoDescanso {
  return valor === "curto" || valor === "prescrito" || valor === "longo";
}

/**
 * Segundos de descanso para um ritmo, a partir do prescrito.
 *
 * O prescrito é devolvido intacto: arredondá-lo faria o app contradizer
 * o número que a própria tela exibe como prescrição.
 */
export function segundosDeDescanso(descansoPrescritoSeg: number, ritmo: RitmoDescanso): number {
  if (ritmo === "prescrito") return descansoPrescritoSeg;
  const bruto = descansoPrescritoSeg * FATOR[ritmo];
  const arredondado = Math.round(bruto / PASSO_SEG) * PASSO_SEG;
  return Math.min(MAXIMO_SEG, Math.max(MINIMO_SEG, arredondado));
}

/** `90` → `"1:30"`; a mesma leitura do timer, para o rótulo não divergir dele. */
export function formatarDescanso(segundos: number): string {
  const seguro = Math.max(0, Math.trunc(segundos));
  return `${Math.floor(seguro / 60)}:${String(seguro % 60).padStart(2, "0")}`;
}

export interface OpcaoDescanso {
  ritmo: RitmoDescanso;
  segundos: number;
  /** Duração formatada — o rótulo é o tempo, não um adjetivo. */
  rotulo: string;
  /** Nome acessível completo, já que "1:00" sozinho não diz o que é. */
  descricao: string;
}

const DESCRICAO: Record<RitmoDescanso, string> = {
  curto: "Descanso curto",
  prescrito: "Descanso do plano",
  longo: "Descanso longo",
};

/**
 * As três opções, sempre na mesma ordem (curto → prescrito → longo),
 * para que a posição do botão não mude de exercício para exercício.
 */
export function opcoesDescanso(descansoPrescritoSeg: number): OpcaoDescanso[] {
  return (["curto", "prescrito", "longo"] as const).map((ritmo) => {
    const segundos = segundosDeDescanso(descansoPrescritoSeg, ritmo);
    return {
      ritmo,
      segundos,
      rotulo: formatarDescanso(segundos),
      descricao: `${DESCRICAO[ritmo]}: ${formatarDescanso(segundos)}`,
    };
  });
}
