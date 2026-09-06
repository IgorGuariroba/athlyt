/**
 * O "dia" alimentar.
 *
 * Horários são persistidos em UTC com o fuso do usuário usado para
 * apresentação e definição do dia alimentar ou de treino. Instantes
 * vão para o banco em UTC; o recorte do dia é sempre
 * derivado aqui, a partir do fuso do atleta. Guardar o rótulo do dia
 * calculado no servidor com o fuso do servidor seria o erro clássico:
 * uma ceia às 22h de São Paulo cairia no dia seguinte em UTC.
 */

export const FUSO_PADRAO = "America/Sao_Paulo";

/** Rótulo `YYYY-MM-DD` do dia alimentar a que o instante pertence. */
export function diaAlimentar(instante: Date, fuso: string = FUSO_PADRAO): string {
  const formatador = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatador.format(instante);
}

/** Deslocamento do fuso, em minutos, no instante dado. */
function deslocamentoMin(instante: Date, fuso: string): number {
  const local = new Date(
    instante.toLocaleString("en-US", { timeZone: fuso }),
  ).getTime();
  const utc = new Date(instante.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return Math.round((local - utc) / 60_000);
}

/**
 * Intervalo `[inicio, fim)` em UTC que corresponde ao dia local.
 * Buscar por intervalo — e não por um rótulo textual gravado junto ao
 * registro — mantém a consulta correta mesmo se o atleta mudar de
 * fuso depois de já ter registrado refeições.
 */
export function intervaloUtcDoDia(
  dia: string,
  fuso: string = FUSO_PADRAO,
): { inicio: Date; fim: Date } {
  const [ano, mes, dias] = dia.split("-").map(Number);
  if (ano === undefined || mes === undefined || dias === undefined) throw new Error(`Data local inválida: ${dia}`);
  const palpite = Date.UTC(ano, mes - 1, dias, 0, 0, 0);
  // Duas passadas: o deslocamento é avaliado no instante estimado, o
  // que resolve corretamente as viradas de horário de verão.
  let inicio = new Date(palpite - deslocamentoMin(new Date(palpite), fuso) * 60_000);
  inicio = new Date(palpite - deslocamentoMin(inicio, fuso) * 60_000);
  const proximo = new Date(inicio.getTime() + 26 * 60 * 60 * 1000);
  const diaSeguinte = diaAlimentar(proximo, fuso);
  const [ano2, mes2, dia2] = diaSeguinte.split("-").map(Number);
  if (ano2 === undefined || mes2 === undefined || dia2 === undefined) throw new Error(`Data local inválida: ${diaSeguinte}`);
  const palpite2 = Date.UTC(ano2, mes2 - 1, dia2, 0, 0, 0);
  let fim = new Date(palpite2 - deslocamentoMin(new Date(palpite2), fuso) * 60_000);
  fim = new Date(palpite2 - deslocamentoMin(fim, fuso) * 60_000);
  return { inicio, fim };
}

/**
 * Dia local vizinho (`passo` negativo = anterior).
 *
 * A âncora é o meio-dia local, não a meia-noite: partindo de 00:00,
 * subtrair um dia "com folga" para absorver horário de verão aterrissa
 * nas últimas horas do dia *retrasado* e pula um dia inteiro. O
 * meio-dia deixa 12 horas de margem para cada lado, mais do que
 * qualquer transição de fuso exige.
 */
export function diaVizinho(dia: string, passo: number, fuso: string = FUSO_PADRAO): string {
  const meioDia = instanteDeHoraLocal(dia, "12:00", fuso);
  return diaAlimentar(new Date(meioDia.getTime() + passo * 24 * 60 * 60 * 1000), fuso);
}

/** Hora local `HH:MM` do instante, para exibição na linha do tempo. */
export function horaLocal(instante: Date, fuso: string = FUSO_PADRAO): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instante);
}

/** Instante UTC correspondente a `HH:MM` local dentro do dia. */
export function instanteDeHoraLocal(
  dia: string,
  hora: string,
  fuso: string = FUSO_PADRAO,
): Date {
  const { inicio } = intervaloUtcDoDia(dia, fuso);
  const [h, m] = hora.split(":").map(Number);
  if (h === undefined || m === undefined) throw new Error(`Hora local inválida: ${hora}`);
  return new Date(inicio.getTime() + (h * 60 + m) * 60_000);
}
