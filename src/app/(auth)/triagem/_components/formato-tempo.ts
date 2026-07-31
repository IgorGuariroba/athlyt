/**
 * Formatação de durações das etapas de triagem.
 *
 * Minutos crus ("90") não comunicam bem duração: o atleta lê "1 h 30" muito
 * mais rápido. As funções abaixo são a única fonte desses rótulos, usadas
 * tanto no visor quanto nos tiques e no texto lido por leitores de tela.
 */

/** Ex.: 45 → "45 min"; 60 → "1 h"; 90 → "1 h 30 min". */
export function formatarMinutos(minutos: number) {
  const total = Math.round(minutos);
  if (total < 60) return `${total} min`;
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

/** Versão por extenso, para `aria-valuetext`. */
export function descreverMinutos(minutos: number) {
  const total = Math.round(minutos);
  if (total < 60) return `${total} minutos`;
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  const parteHoras = `${horas} ${horas === 1 ? "hora" : "horas"}`;
  return resto === 0 ? parteHoras : `${parteHoras} e ${resto} minutos`;
}

/** Ex.: 7 → "7 h"; 7.5 → "7 h 30 min". */
export function formatarHoras(horas: number) {
  return formatarMinutos(Math.round(horas * 60));
}

/** Versão por extenso, para `aria-valuetext`. */
export function descreverHoras(horas: number) {
  return descreverMinutos(Math.round(horas * 60));
}
