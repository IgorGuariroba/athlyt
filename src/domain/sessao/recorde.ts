/**
 * Recorde pessoal por exercício.
 *
 * "Novo recorde" só significa alguma coisa quando comparado ao
 * histórico *daquele exercício* — e a comparação precisa olhar para
 * carga e repetições juntas. Comparar só a carga faz 60 kg × 5 reps
 * parecer recorde depois de 60 kg × 9 reps na mesma sessão, o que é
 * falso: a série mais curta foi um esforço menor.
 *
 * As três marcas que reconhecemos, em ordem de prioridade:
 *  - `e1rm`  — intensidade: força estimada (Epley). A marca principal.
 *  - `carga` — maior peso já levantado no exercício, independentemente
 *              das repetições. É a marca que o atleta reconhece na barra.
 *  - `volume`— carga × repetições na série. Trabalho da série.
 *
 * Todas comparam contra o melhor anterior, que inclui as séries já
 * feitas na sessão em curso: recorde só é recorde uma vez.
 */

export type TipoRecorde = "e1rm" | "carga" | "volume";

export interface MarcaExercicio {
  e1rmKg: number;
  cargaKg: number;
  volumeKg: number;
}

export interface SerieExecutada {
  cargaKg: number | null;
  repeticoes: number | null;
}

export const MARCA_ZERO: MarcaExercicio = { e1rmKg: 0, cargaKg: 0, volumeKg: 0 };

/** Diferença mínima para valer como recorde; evita comemorar ruído de arredondamento. */
const MARGEM_KG = 0.1;

/**
 * 1RM estimado por Epley: carga × (1 + reps/30). Vale para faixas de
 * treino (até ~12 reps); acima disso a estimativa infla e por isso a
 * repetição considerada é limitada.
 */
export function e1rm(cargaKg: number, repeticoes: number): number {
  if (cargaKg <= 0 || repeticoes <= 0) return 0;
  return cargaKg * (1 + Math.min(repeticoes, 12) / 30);
}

/** Carga estimada para um número alvo de repetições, a partir de uma série realizada. */
export function estimativaRm(cargaKg: number, repeticoes: number, repeticoesAlvo: number): number | null {
  const forca = e1rm(cargaKg, repeticoes);
  if (forca === 0) return null;
  return Math.round((forca / (1 + repeticoesAlvo / 30)) * 10) / 10;
}

export function marcaDaSerie(serie: SerieExecutada): MarcaExercicio {
  const carga = serie.cargaKg ?? 0;
  const reps = serie.repeticoes ?? 0;
  if (carga <= 0 || reps <= 0) return MARCA_ZERO;
  return { e1rmKg: e1rm(carga, reps), cargaKg: carga, volumeKg: carga * reps };
}

export function combinarMarcas(a: MarcaExercicio, b: MarcaExercicio): MarcaExercicio {
  return {
    e1rmKg: Math.max(a.e1rmKg, b.e1rmKg),
    cargaKg: Math.max(a.cargaKg, b.cargaKg),
    volumeKg: Math.max(a.volumeKg, b.volumeKg),
  };
}

export function melhorMarca(series: SerieExecutada[]): MarcaExercicio {
  return series.map(marcaDaSerie).reduce(combinarMarcas, MARCA_ZERO);
}

export interface Recorde {
  tipo: TipoRecorde;
  /** Valor alcançado, em kg (e1RM estimado, carga da barra ou volume da série). */
  valor: number;
  rotulo: string;
}

const ROTULOS: Record<TipoRecorde, string> = {
  e1rm: "Novo recorde de força",
  carga: "Novo recorde de carga",
  volume: "Novo recorde de volume",
};

/**
 * Avalia uma série contra a melhor marca anterior do mesmo exercício.
 * Devolve no máximo um recorde — o de maior significado — para a tela
 * não virar uma parede de troféus.
 */
export function avaliarRecorde(serie: SerieExecutada, anterior: MarcaExercicio): Recorde | null {
  const marca = marcaDaSerie(serie);
  if (marca.e1rmKg === 0) return null;
  // Sem histórico não há o que superar: a primeira série de um
  // exercício é uma linha de base, não uma conquista.
  if (anterior.e1rmKg === 0) return null;

  const candidatos: Array<[TipoRecorde, number, number]> = [
    ["e1rm", marca.e1rmKg, anterior.e1rmKg],
    ["carga", marca.cargaKg, anterior.cargaKg],
    ["volume", marca.volumeKg, anterior.volumeKg],
  ];
  for (const [tipo, valor, referencia] of candidatos) {
    if (valor > referencia + MARGEM_KG) {
      return { tipo, valor: Math.round(valor * 10) / 10, rotulo: ROTULOS[tipo] };
    }
  }
  return null;
}
