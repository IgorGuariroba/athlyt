import { diaVizinho } from "@/domain/diario/dia-alimentar";

/**
 * Rótulo humano de um dia alimentar ("Hoje", "Ontem", "17 ago.").
 *
 * Compartilhado entre o Diário e a Dieta: as duas telas navegam pelo
 * mesmo eixo de dias e não podem chamar o mesmo dia por nomes
 * diferentes.
 */
export function rotuloDoDia(dia: string, hoje: string, fuso: string): string {
  if (dia === hoje) return "Hoje";
  if (dia === diaVizinho(hoje, -1, fuso)) return "Ontem";
  const [ano, mes, diaMes] = dia.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(ano, mes - 1, diaMes)));
}
