/**
 * Plano de peso: a leitura "de onde parti, para onde vou, onde estou".
 *
 * O gráfico do Progresso é composto por três coisas que não têm a
 * mesma natureza, e confundi-las é o erro fácil aqui:
 *
 * 1. **A linha de meta é uma promessa**, não um dado observado. Ela vai
 *    de (peso inicial, dia 0) até (meta vigente, dia 120). Origem e
 *    destino são absolutos no tempo, então a inclinação **não muda**
 *    quando o atleta troca o horizonte exibido — trocar o filtro é
 *    zoom, não reescrita do plano. Uma meta cuja inclinação dependesse
 *    do recorte visível mentiria sobre o esforço exigido.
 * 2. **A polilinha é o que aconteceu**: liga todas as medições, sem
 *    suavizar. A reta entre a primeira e a última medição seria mais
 *    limpa e contradiria os pontos do meio.
 * 3. **O horizonte é fixo em 120 dias.** Sem prazo, "chegar a 76 kg"
 *    não define reta alguma — faltaria o segundo ponto do plano. Fixar
 *    o prazo evita uma coluna de data-alvo e mantém toda meta
 *    comparável com qualquer outra.
 *
 * A aritmética soma milissegundos a um **instante** (a medição
 * inicial), não a uma meia-noite local: não há fronteira de dia por
 * perto, então a armadilha de horário de verão descrita em
 * `docs/memory/aritmetica-de-dias-locais.md` não se aplica.
 */

/** Prazo único de toda meta de peso. Ver decisão 3 no bloco acima. */
export const HORIZONTE_META_DIAS = 120;

const DIA_EM_MS = 24 * 60 * 60 * 1000;

/** Recortes oferecidos no seletor acima do gráfico. */
export const HORIZONTES_DISPONIVEIS = [30, 90, 120] as const;

export type HorizonteDias = (typeof HORIZONTES_DISPONIVEIS)[number];

export type MedicaoPeso = { data: Date; pesoKg: number };

export type PlanoDePeso = {
  /** Instante do dia 0 — a medição inicial. */
  inicio: Date;
  /** Borda direita do eixo do tempo. */
  fim: Date;
  /** Medições dentro do recorte, em ordem cronológica. */
  medicoes: readonly MedicaoPeso[];
  /**
   * Linha de meta já recortada ao eixo visível: dois pontos enquanto
   * é rampa, três quando o prazo vence dentro do recorte e ela segue
   * horizontal. Ausente quando não há meta registrada.
   */
  linhaMeta: readonly MedicaoPeso[] | null;
  /** Extremos do eixo de peso, incluindo a meta mesmo se distante. */
  minKg: number;
  maxKg: number;
};

const emDias = (inicio: Date, dias: number) =>
  new Date(inicio.getTime() + dias * DIA_EM_MS);

/**
 * Monta o plano exibível.
 *
 * Retorna `null` quando não há peso inicial: sem o dia 0 não existe
 * origem para a linha de meta nem para a polilinha, e desenhar um
 * gráfico ancorado em nada seria pior do que o estado vazio.
 */
export function montarPlanoDePeso({
  medicoes,
  pesoMetaKg,
  horizonteDias,
  agora,
}: {
  medicoes: readonly MedicaoPeso[];
  pesoMetaKg?: number;
  horizonteDias: HorizonteDias;
  agora: Date;
}): PlanoDePeso | null {
  const ordenadas = [...medicoes].sort(
    (a, b) => a.data.getTime() - b.data.getTime(),
  );
  const inicial = ordenadas[0];
  if (!inicial) return null;

  const inicio = inicial.data;
  const bordaDoHorizonte = emDias(inicio, horizonteDias);
  // Só a visão completa acompanha o presente. Esticar também os
  // recortes de 30 e 90 dias até hoje anularia o zoom: no dia 100 do
  // plano, os três botões mostrariam exatamente o mesmo desenho.
  const fim =
    horizonteDias === HORIZONTE_META_DIAS && agora > bordaDoHorizonte
      ? agora
      : bordaDoHorizonte;

  const visiveis = ordenadas.filter(
    ({ data }) => data >= inicio && data <= fim,
  );

  const linhaMeta =
    pesoMetaKg === undefined
      ? null
      : construirLinhaMeta({
          inicio,
          fim,
          pesoInicialKg: inicial.pesoKg,
          pesoMetaKg,
        });

  const valores = [
    ...visiveis.map(({ pesoKg }) => pesoKg),
    ...(linhaMeta?.map(({ pesoKg }) => pesoKg) ?? []),
  ];

  return {
    inicio,
    fim,
    medicoes: visiveis,
    linhaMeta,
    minKg: Math.min(...valores),
    maxKg: Math.max(...valores),
  };
}

function construirLinhaMeta({
  inicio,
  fim,
  pesoInicialKg,
  pesoMetaKg,
}: {
  inicio: Date;
  fim: Date;
  pesoInicialKg: number;
  pesoMetaKg: number;
}): readonly MedicaoPeso[] {
  const alvo = emDias(inicio, HORIZONTE_META_DIAS);
  const partida = { data: inicio, pesoKg: pesoInicialKg };

  // Recorte antes do prazo: a rampa é cortada no fim do eixo, mas
  // mantém a inclinação — é o mesmo plano visto de mais perto.
  if (fim < alvo) {
    const fracao = (fim.getTime() - inicio.getTime()) / (alvo.getTime() - inicio.getTime());
    return [
      partida,
      { data: fim, pesoKg: pesoInicialKg + (pesoMetaKg - pesoInicialKg) * fracao },
    ];
  }

  const chegada = { data: alvo, pesoKg: pesoMetaKg };
  // Prazo vencido dentro do eixo: a meta deixa de ser rampa e vira
  // patamar. Continuar descendo prometeria um alvo que já passou.
  return fim > alvo
    ? [partida, chegada, { data: fim, pesoKg: pesoMetaKg }]
    : [partida, chegada];
}
