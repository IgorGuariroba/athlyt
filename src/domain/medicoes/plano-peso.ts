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

export interface MedicaoPeso { data: Date; pesoKg: number }

export interface PlanoDePeso {
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
}

const emDias = (inicio: Date, dias: number) =>
  new Date(inicio.getTime() + dias * DIA_EM_MS);

/** Marcas do eixo de peso e os extremos que elas definem. */
export interface EscalaDePeso {
  /** Valores rotulados, do menor ao maior, igualmente espaçados. */
  marcas: readonly number[];
  pisoKg: number;
  tetoKg: number;
}

/** Alvo de marcas; o passo escolhido pode entregar uma a menos ou mais. */
const MARCAS_ALVO = 4;

/**
 * Amplitude mínima do eixo de peso, em kg.
 *
 * Sem piso, uma semana de manutenção com 300 g de oscilação ocuparia a
 * altura inteira do gráfico e pareceria transformação — e a distorção
 * apareceria justamente ao trocar 30/90/120, que é quando o atleta
 * compara. Peso diário varia ±0,5–1 kg só por hidratação, glicogênio e
 * sódio; cobrir ao menos 2 kg mantém esse ruído em fração da altura
 * sem achatar progresso real.
 *
 * Praticamente inerte quando a rampa da meta já exige mais amplitude,
 * que é o caso comum fora de manutenção.
 */
const AMPLITUDE_MINIMA_KG = 2;

/**
 * Passos aceitos, por ordem de preferência dentro de cada década.
 *
 * São os únicos incrementos que se somam de cabeça: contar de 2,5 em
 * 2,5 ainda é barato; de 3 em 3 já exige aritmética consciente.
 */
const PASSOS_LEGIVEIS = [1, 2, 2.5, 5, 10];

/**
 * Escolhe marcas redondas que enquadram a faixa observada.
 *
 * A alternativa — derivar a grade dos próprios extremos mais uma folga
 * percentual — produz rótulos como "84,2 kg": números que ninguém
 * reconhece e que **se movem a cada troca de recorte**, porque mudam
 * junto com o mínimo e o máximo da série visível. A grade existe para
 * estimar um ponto sem medi-lo, e só se estima rápido contra valores
 * redondos que permanecem no lugar.
 *
 * Arredonda **para fora**: a escala cresce até a próxima marca em vez
 * de cortar dado. Efeito colateral desejado — a meta deixa de encostar
 * na borda inferior e passa a flutuar dentro de uma faixa rotulada, o
 * que informa mais do que uma linha colada no limite do desenho.
 *
 * Não inclui o zero: peso corporal oscila numa faixa estreita e longe
 * da origem; ancorar em zero achataria 6 kg de variação em uma fração
 * ilegível da altura. O eixo truncado exagera a variação, e é
 * justamente por isso que as marcas são rotuladas: quem lê vê que a
 * base é 78, não 0.
 */
export function calcularEscalaDePeso({
  minKg,
  maxKg,
}: {
  minKg: number;
  maxKg: number;
}): EscalaDePeso {
  // Expande em torno do centro da faixa real, e não para um dos lados:
  // crescer só para cima ou só para baixo colaria a série inteira em
  // uma extremidade do desenho.
  const centro = (minKg + maxKg) / 2;
  const meiaAmplitude = Math.max(maxKg - minKg, AMPLITUDE_MINIMA_KG) / 2;
  const alvoMin = centro - meiaAmplitude;
  const alvoMax = centro + meiaAmplitude;

  const passo = escolherPasso((alvoMax - alvoMin) / MARCAS_ALVO);
  const pisoKg = Math.floor(alvoMin / passo) * passo;
  const tetoKg = Math.ceil(alvoMax / passo) * passo;

  const marcas: number[] = [];
  // Acumular por multiplicação, e não somando `passo` repetidamente,
  // evita que o erro de ponto flutuante se acumule e produza 84.00001.
  const total = Math.round((tetoKg - pisoKg) / passo);
  for (let i = 0; i <= total; i += 1) {
    marcas.push(Number((pisoKg + i * passo).toFixed(10)));
  }

  return { marcas, pisoKg: marcas[0], tetoKg: marcas[marcas.length - 1] };
}

/**
 * Quantidade de datas rotuladas no eixo do tempo.
 *
 * Quatro é o teto de largura: a 10px, "07 de ago." ocupa perto de 55px
 * dos 320 do desenho, e uma quinta marca encostaria na vizinha no
 * telefone mais estreito.
 */
const MARCAS_DE_TEMPO = 4;

/**
 * Datas rotuladas do eixo do tempo, das pontas ao meio.
 *
 * Divide a janela em partes iguais em vez de buscar datas de calendário
 * redondas (todo dia 1º, toda segunda-feira). O eixo aqui **é o plano**,
 * ancorado no dia 0 da primeira medição: um passo de 30 dias a partir
 * dela é a leitura pretendida — "um terço do caminho" —, enquanto uma
 * grade de calendário deixaria a primeira e a última marca a distâncias
 * arbitrárias das bordas, e as pontas do eixo são exatamente o que o
 * gráfico promete (de onde parti, até quando).
 *
 * Inclui as duas extremidades, então `inicio` e `fim` continuam
 * rotulados como antes — as marcas do meio é que faltavam para que o
 * espaço entre elas fosse legível como tempo, e não como vazio.
 */
export function calcularMarcasDeTempo({
  inicio,
  fim,
}: Pick<PlanoDePeso, "inicio" | "fim">): readonly Date[] {
  const janela = fim.getTime() - inicio.getTime();
  return Array.from(
    { length: MARCAS_DE_TEMPO },
    (_, i) =>
      new Date(inicio.getTime() + (janela * i) / (MARCAS_DE_TEMPO - 1)),
  );
}

/**
 * Frase de distância até a meta, para leitura imediata do "como estou
 * indo".
 *
 * Avalia **estado atual contra alvo atual**: se o peso voltar para o
 * lado errado do alvo, a distância reaparece. "Atingiu em algum
 * momento" seria histórico, e não é o que esta tela responde.
 *
 * O cruzamento respeita a **direção original** — de onde o atleta
 * partiu rumo à meta — e não o módulo da diferença: quem saiu de 105
 * para 95 kg e chegou a 88 ultrapassou o alvo no sentido pretendido,
 * enquanto `Math.abs` acusaria 7 kg faltando.
 *
 * Devolve `null` quando a meta coincide com o ponto de partida: é
 * manutenção, não percurso. Anunciar "Meta alcançada" a quem nunca
 * teve distância a percorrer parabenizaria por nada — e continuaria
 * dizendo isso mesmo se o peso se afastasse do alvo.
 */
export function descreverDistanciaAMeta({
  pesoInicialKg,
  pesoAtualKg,
  pesoMetaKg,
}: {
  pesoInicialKg: number;
  pesoAtualKg: number;
  pesoMetaKg: number;
}): string | null {
  const sentido = Math.sign(pesoMetaKg - pesoInicialKg);
  if (sentido === 0) return null;
  const restante = (pesoMetaKg - pesoAtualKg) * sentido;
  if (restante <= 0) return "Meta alcançada";
  return `Faltam ${restante.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
}

/**
 * Menor passo legível maior ou igual ao passo ideal.
 *
 * A busca sempre encontra: `ideal` cai em [década, 10 × década) por
 * construção, e o último candidato é exatamente 10 × década.
 */
function escolherPasso(ideal: number): number {
  const decada = 10 ** Math.floor(Math.log10(ideal));
  const passoEscolhido = PASSOS_LEGIVEIS.find((passo) => passo * decada >= ideal) ?? 10;
  return passoEscolhido * decada;
}

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
