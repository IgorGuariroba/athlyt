export const METODOLOGIA_VISUAL_VERSAO = "visual-v1";

export interface CriteriosVisuais {
  vTaper: number;
  ombros: number;
  cintura: number;
  equilibrio: number;
  simetria: number;
}

export function consolidarAvaliacaoVisual(entrada: {
  criterios: CriteriosVisuais;
  gorduraVisual: { minimoPercentual: number; maximoPercentual: number };
  observacoes: string[];
  limitacoes: string[];
}) {
  const notas = Object.values(entrada.criterios);
  if (notas.some((nota) => !Number.isInteger(nota) || nota < 0 || nota > 100)) throw new Error("Critério visual fora da faixa de 0 a 100.");
  const { minimoPercentual, maximoPercentual } = entrada.gorduraVisual;
  if (!Number.isFinite(minimoPercentual) || !Number.isFinite(maximoPercentual) || minimoPercentual < 2 || maximoPercentual > 70 || maximoPercentual - minimoPercentual < 2) throw new Error("Informe uma faixa probabilística válida, nunca um percentual exato.");
  const confianca: "alta" | "moderada" | "baixa" =
    entrada.limitacoes.length === 0
      ? "alta"
      : entrada.limitacoes.length <= 2
        ? "moderada"
        : "baixa";
  return {
    criterios: entrada.criterios,
    gorduraVisual: { minimoBasisPoints: Math.round(minimoPercentual * 100), maximoBasisPoints: Math.round(maximoPercentual * 100) },
    observacoes: entrada.observacoes,
    limitacoes: entrada.limitacoes,
    confianca: confianca,
    metodologiaVersao: METODOLOGIA_VISUAL_VERSAO,
  };
}

export function avaliarCompatibilidadeFotos(entrada: { poseAnterior: string; poseAtual: string; condicoesAnterior?: string | null; condicoesAtual?: string | null }) {
  if (entrada.poseAnterior !== entrada.poseAtual) return { comparavel: false, confianca: "indisponivel" as const, motivos: ["Poses diferentes"] };
  const diferentes = Boolean(entrada.condicoesAnterior && entrada.condicoesAtual && entrada.condicoesAnterior.trim().toLowerCase() !== entrada.condicoesAtual.trim().toLowerCase());
  return { comparavel: true, confianca: diferentes ? "limitada" as const : "confiavel" as const, motivos: diferentes ? ["Condições de captura diferentes"] : [] };
}
