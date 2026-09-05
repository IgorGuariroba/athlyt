/**
 * `fita-v2` registra uma leitura por região. A v1 exigia duas leituras
 * e uma terceira por divergência; medições gravadas sob ela continuam
 * com esse protocolo no banco e não devem ser reinterpretadas.
 */
export const PROTOCOLO_CIRCUNFERENCIAS_VERSAO = "fita-v2";
export const METODOLOGIA_METAS_VERSAO = "trajetoria-v1";

export type QualidadeMedicao = "alta" | "moderada" | "baixa";
export type EstadoConfianca = "confiavel" | "limitada" | "indisponivel";
export type RegiaoCorporal =
  | "cintura" | "pescoco" | "quadril" | "torax" | "ombros"
  | "braco" | "coxa" | "panturrilha" | "punho" | "tornozelo";
export type LadoCorporal = "unico" | "direito" | "esquerdo";

export interface MedicaoCorporal {
  regiao: RegiaoCorporal;
  lado: LadoCorporal;
  leiturasMm: number[];
  valorMm: number;
  qualidade: QualidadeMedicao;
  observadoEm: Date;
}

export interface ConfiancaCorporal {
  composicaoCorporal: EstadoConfianca;
  proporcoes: EstadoConfianca;
  simetriaBilateral: EstadoConfianca;
  treinamento: EstadoConfianca;
  nutricao: EstadoConfianca;
  saudeRecuperacao: EstadoConfianca;
}

export interface MetaProporcao {
  regiao: RegiaoCorporal;
  atualMm: number;
  faixaMinMm: number;
  faixaMaxMm: number;
  metaCicloMm: number;
  direcao: "aumentar" | "reduzir" | "manter";
  confianca: QualidadeMedicao;
  justificativa: string;
  metodologiaVersao: string;
}

const mediana = (valores: number[]) => {
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[meio] : Math.round((ordenados[meio - 1] + ordenados[meio]) / 2);
};

/**
 * Consolida o protocolo doméstico sem deixar tolerâncias vazarem para a UI.
 *
 * Uma leitura basta (`fita-v2`): repetir a mesma região na mesma sessão
 * pesa no uso real e a evolução vem de remedir ao longo do tempo, não de
 * medir três vezes hoje. Leituras extras continuam aceitas para quem
 * quiser conferir — nesse caso a mediana vale e a amplitude vira sinal
 * de `qualidade`, que a Revisão Semanal usa ao ponderar evidências.
 *
 * Sem repetição não há como distinguir erro de fita de mudança real, por
 * isso a leitura única entra como `moderada`: honesta sobre a incerteza
 * sem impedir o registro.
 */
export function consolidarCircunferencia(leiturasCm: number[]):
  | { ok: true; leiturasMm: number[]; valorMm: number; qualidade: QualidadeMedicao }
  | { ok: false; erro: string } {
  const leiturasMm = leiturasCm
    .filter((v) => Number.isFinite(v))
    .map((v) => Math.round(v * 10));
  if (leiturasMm.length === 0 || leiturasMm.length > 3 || leiturasMm.some((v) => v < 100 || v > 2500)) {
    return { ok: false, erro: "Informe a medida em centímetros, entre 10 e 250." };
  }
  const amplitude = Math.max(...leiturasMm) - Math.min(...leiturasMm);
  if (leiturasMm.length > 1 && amplitude > 20) {
    return { ok: false, erro: "As leituras estão muito diferentes; confira o posicionamento da fita." };
  }
  return {
    ok: true,
    leiturasMm,
    valorMm: mediana(leiturasMm),
    qualidade:
      leiturasMm.length === 1 ? "moderada" : amplitude <= 5 ? "alta" : amplitude <= 10 ? "moderada" : "baixa",
  };
}

export function avaliarConfiancaCorporal(entrada: {
  regioes: ReadonlySet<string>;
  possuiGordura: boolean;
  possuiFotos: boolean;
  triagemTreinoCompleta: boolean;
  triagemNutricaoCompleta: boolean;
  saudeInformada: boolean;
}): ConfiancaCorporal {
  const essenciais = ["cintura", "pescoco", "quadril"].every((r) => entrada.regioes.has(r));
  const proporcoes = ["cintura", "torax", "ombros", "braco", "coxa", "panturrilha"].every((r) => entrada.regioes.has(r));
  const bilateral = ["braco:direito", "braco:esquerdo", "coxa:direito", "coxa:esquerdo", "panturrilha:direito", "panturrilha:esquerdo"].every((r) => entrada.regioes.has(r));
  return {
    composicaoCorporal: entrada.possuiGordura && essenciais ? "confiavel" : essenciais || entrada.possuiGordura ? "limitada" : "indisponivel",
    proporcoes: proporcoes ? "confiavel" : essenciais ? "limitada" : "indisponivel",
    simetriaBilateral: bilateral && entrada.possuiFotos ? "confiavel" : bilateral ? "limitada" : "indisponivel",
    treinamento: entrada.triagemTreinoCompleta ? (proporcoes ? "confiavel" : "limitada") : "indisponivel",
    nutricao: entrada.triagemNutricaoCompleta ? (essenciais ? "confiavel" : "limitada") : "indisponivel",
    saudeRecuperacao: entrada.saudeInformada ? "confiavel" : "limitada",
  };
}

/**
 * Metas iniciais deliberadamente conservadoras: a faixa é de trajetória,
 * não uma alegação de corpo perfeito. Calibrações futuras criam nova versão.
 */
export function gerarMetasProporcao(medicoes: readonly MedicaoCorporal[], enfases: readonly string[] = []): MetaProporcao[] {
  const maisRecentes = new Map<string, MedicaoCorporal>();
  for (const medicao of [...medicoes].sort((a, b) => b.observadoEm.getTime() - a.observadoEm.getTime())) {
    if (!maisRecentes.has(medicao.regiao)) maisRecentes.set(medicao.regiao, medicao);
  }
  return [...maisRecentes.values()]
    .filter((m) => ["cintura", "torax", "ombros", "braco", "coxa", "panturrilha"].includes(m.regiao))
    .map((m) => {
      const priorizada = enfases.includes(m.regiao);
      const reduzir = m.regiao === "cintura";
      const delta = reduzir ? -Math.round(m.valorMm * 0.02) : priorizada ? Math.round(m.valorMm * 0.02) : 0;
      const meta = m.valorMm + delta;
      return {
        regiao: m.regiao,
        atualMm: m.valorMm,
        faixaMinMm: Math.round(m.valorMm * 0.95),
        faixaMaxMm: Math.round(m.valorMm * 1.05),
        metaCicloMm: meta,
        direcao: delta < 0 ? "reduzir" : delta > 0 ? "aumentar" : "manter",
        confianca: m.qualidade,
        justificativa: reduzir
          ? "Meta de ciclo conservadora; redução depende da tendência corporal geral."
          : priorizada
            ? "Região escolhida como ênfase; progressão condicionada a desempenho e recuperação."
            : "Manter no ciclo atual enquanto o conjunto e a resposta real são observados.",
        metodologiaVersao: METODOLOGIA_METAS_VERSAO,
      };
    });
}

export function calcularPendenciasCadencia(entrada: { agora: Date; ultimoPeso?: Date; ultimaCintura?: Date; ultimaCompleta?: Date; ultimasFotos?: Date; reduzirFrequencia?: boolean }) {
  const dias = (data?: Date) => data ? (entrada.agora.getTime() - data.getTime()) / 86_400_000 : Infinity;
  const fator = entrada.reduzirFrequencia ? 2 : 1;
  return {
    peso: dias(entrada.ultimoPeso) >= 1 * fator,
    cintura: dias(entrada.ultimaCintura) >= 7 * fator,
    completa: dias(entrada.ultimaCompleta) >= 28 * fator,
    fotos: dias(entrada.ultimasFotos) >= 28 * fator,
  };
}

export function detectarAssimetriaSuspeita(entrada: { direitoMm: number; esquerdoMm: number; dor?: boolean; inchaco?: boolean; perdaForca?: boolean }) {
  const diferencaMm = Math.abs(entrada.direitoMm - entrada.esquerdoMm);
  const sintomas = Boolean(entrada.dor) || Boolean(entrada.inchaco) || Boolean(entrada.perdaForca);
  return {
    diferencaMm,
    confirmavel: diferencaMm > 10 && !sintomas,
    cautela: diferencaMm > 10 && sintomas,
  };
}
