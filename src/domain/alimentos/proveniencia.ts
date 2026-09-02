/**
 * Proveniência e ponderação de fontes nutricionais.
 *
 * A composição nutricional mantém proveniência por alimento e por
 * nutriente: todo número exibido sabe dizer de onde veio.
 *
 * Duas regras dão forma a este módulo:
 *
 * 1. Diante de fontes conflitantes, o app **elege uma fonte real** em
 *    vez de tirar média. Uma média entre 165 e 240 kcal produz um
 *    número que nenhuma fonte sustenta e que ninguém consegue
 *    auditar: esconder incerteza atrás de um valor inventado é
 *    proibido.
 * 2. O que foi descartado continua visível. A divergência é o dado
 *    mais informativo quando é material, e some para sempre se a
 *    escolha guardar só o vencedor.
 */

export type TipoFonte = "tabela-oficial" | "rotulo" | "colaborativa" | "usuario" | "estimativa-ia";

export interface CriterioFonte {
  id: string;
  rotulo: string;
  peso: number;
}

/**
 * Seis critérios de ponderação com peso explícito: credencial da
 * fonte, método analítico, reprodutibilidade, atualidade, adequação ao
 * contexto e concordância entre fontes. Os pesos somam 100; mudar a
 * lista altera a pontuação de todo valor auditado.
 */
export const CRITERIOS_FONTE: readonly CriterioFonte[] = [
  { id: "credencial", rotulo: "Credencial da fonte", peso: 30 },
  { id: "metodo", rotulo: "Método analítico", peso: 20 },
  { id: "reprodutibilidade", rotulo: "Reprodutibilidade", peso: 15 },
  { id: "atualidade", rotulo: "Atualidade", peso: 15 },
  { id: "adequacao-contextual", rotulo: "Adequação ao contexto", peso: 10 },
  { id: "concordancia", rotulo: "Concordância entre fontes", peso: 10 },
];

/**
 * Credencial por tipo de fonte. Uma tabela oficial de composição é
 * mais defensável que um rótulo (sujeito a tolerância regulatória),
 * que por sua vez supera uma base colaborativa não validada.
 * `estimativa-ia` fica no piso: a spec exige que a IA nunca invente
 * composição sem se declarar estimativa.
 */
const CREDENCIAL: Record<TipoFonte, number> = {
  "tabela-oficial": 1,
  rotulo: 0.75,
  usuario: 0.5,
  colaborativa: 0.35,
  "estimativa-ia": 0.2,
};

export interface ValorDeFonte {
  fonte: string;
  tipo: TipoFonte;
  versao: string;
  /** Data ISO da versão consultada; sustenta o critério de atualidade. */
  atualizadaEm: string;
  metodoAnalitico: boolean;
  reprodutivel: boolean;
  /** Adequada ao alimento/preparo/região do atleta. */
  contextoLocal: boolean;
  valor: number;
}

/**
 * Discordância relativa a partir da qual as fontes são consideradas
 * materialmente divergentes. Abaixo disso, a diferença cabe na
 * variabilidade natural do alimento e não merece alarde.
 */
export const TOLERANCIA_DIVERGENCIA = 0.1;

/** Meia-vida da atualidade: uma fonte de 10 anos vale metade de uma nova. */
const MEIA_VIDA_ANOS = 10;

function atualidade(valor: ValorDeFonte, hoje: Date): number {
  const anos = (hoje.getTime() - new Date(valor.atualizadaEm).getTime()) / (365.25 * 24 * 3600 * 1000);
  if (!Number.isFinite(anos)) return 0;
  return Math.max(0, Math.min(1, 1 / (1 + Math.max(0, anos) / MEIA_VIDA_ANOS)));
}

/**
 * Concordância: quão perto esta fonte está da mediana das demais. É o
 * único critério que depende do conjunto — é ele que faz um valor
 * isolado perder força sem que precisemos declarar qual está "certo".
 */
function concordancia(valor: ValorDeFonte, valores: readonly ValorDeFonte[]): number {
  const outros = valores.filter((v) => v !== valor).map((v) => v.valor);
  if (outros.length === 0) return 0.5; // sem conjunto, nem prêmio nem castigo
  const ordenados = [...outros].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  const mediana =
    ordenados.length % 2 === 0 ? (ordenados[meio - 1] + ordenados[meio]) / 2 : ordenados[meio];
  if (mediana === 0) return valor.valor === 0 ? 1 : 0;
  const desvio = Math.abs(valor.valor - mediana) / Math.abs(mediana);
  return Math.max(0, 1 - desvio);
}

function peso(id: string): number {
  return CRITERIOS_FONTE.find((c) => c.id === id)!.peso;
}

/** Pontuação 0–100 da fonte, pelos seis critérios ponderados. */
export function pontuarFonte(
  valor: ValorDeFonte,
  contexto: { hoje: Date; valores: readonly ValorDeFonte[] },
): number {
  const notas: Array<[string, number]> = [
    ["credencial", CREDENCIAL[valor.tipo]],
    ["metodo", valor.metodoAnalitico ? 1 : 0],
    ["reprodutibilidade", valor.reprodutivel ? 1 : 0],
    ["atualidade", atualidade(valor, contexto.hoje)],
    ["adequacao-contextual", valor.contextoLocal ? 1 : 0],
    ["concordancia", concordancia(valor, contexto.valores)],
  ];
  return notas.reduce((total, [id, nota]) => total + nota * peso(id), 0);
}

export interface EscolhaDeValor {
  valor: number;
  escolhida: ValorDeFonte;
  pontuacao: number;
  descartadas: ValorDeFonte[];
  /** Fontes discordam além da tolerância: a incerteza é exibida. */
  divergenciaMaterial: boolean;
}

/**
 * Elege o valor mais defensável entre fontes conflitantes.
 *
 * Empate desempata pelo tipo de fonte e depois pela ordem recebida —
 * determinismo importa aqui, porque a escolha entra na Trilha de
 * Decisão e precisa ser reproduzível.
 */
export function escolherValor(
  valores: readonly ValorDeFonte[],
  contexto: { hoje: Date },
): EscolhaDeValor {
  if (valores.length === 0) {
    throw new Error("A escolha de valor nutricional exige ao menos uma fonte.");
  }
  const pontuadas = valores.map((valor) => ({
    valor,
    pontuacao: pontuarFonte(valor, { hoje: contexto.hoje, valores }),
  }));
  const [melhor, ...resto] = [...pontuadas].sort(
    (a, b) => b.pontuacao - a.pontuacao || CREDENCIAL[b.valor.tipo] - CREDENCIAL[a.valor.tipo],
  );

  const numeros = valores.map((v) => v.valor);
  const maior = Math.max(...numeros);
  const menor = Math.min(...numeros);
  const referencia = Math.abs(melhor.valor.valor) || 1;
  const divergenciaMaterial = (maior - menor) / referencia > TOLERANCIA_DIVERGENCIA;

  return {
    valor: melhor.valor.valor,
    escolhida: melhor.valor,
    pontuacao: Math.round(melhor.pontuacao),
    descartadas: resto.map((p) => p.valor),
    divergenciaMaterial,
  };
}

/**
 * Grau de confiança exibível: estimativa não pode se passar por
 * medição. A faixa vem da pontuação da fonte eleita e da
 * existência de divergência material.
 */
export type Confianca = "alta" | "media" | "baixa";

export function confiancaDaEscolha(escolha: EscolhaDeValor): Confianca {
  if (escolha.divergenciaMaterial) return escolha.pontuacao >= 80 ? "media" : "baixa";
  if (escolha.pontuacao >= 75) return "alta";
  return escolha.pontuacao >= 50 ? "media" : "baixa";
}

export const ROTULO_CONFIANCA: Record<Confianca, string> = {
  alta: "Valor de tabela analítica",
  media: "Valor aproximado",
  baixa: "Estimativa — pode variar bastante",
};

/**
 * Confiança de um valor **estimado por IA a partir de imagem**.
 *
 * Precisa de rótulos próprios porque `ROTULO_CONFIANCA` fala da fonte
 * ponderada: dizer "valor de tabela analítica" sobre um frango que o
 * modelo apenas reconheceu numa foto é falso, e falso exatamente no
 * ponto mais sensível — estimativa não pode se passar por medição.
 * Aqui `alta` significa "o modelo está seguro do que viu",
 * o que continua sendo um palpite sobre a porção.
 */
export const ROTULO_CONFIANCA_ESTIMATIVA: Record<Confianca, string> = {
  alta: "Estimativa — alimento e porção claros na foto",
  media: "Estimativa — porção incerta",
  baixa: "Estimativa — pouco visível na foto",
};

/**
 * Confiança de um valor estimado **a partir da descrição** do atleta,
 * escrita ou ditada.
 *
 * Não reusa os rótulos de foto porque a incerteza tem outra origem:
 * quem descreve sabe o que comeu e erra a porção, enquanto a foto
 * pode errar o próprio alimento. Dizer "pouco visível na foto" sobre
 * um prato que ninguém fotografou seria falso justo onde o rótulo
 * deveria proteger o atleta.
 */
export const ROTULO_CONFIANCA_DESCRICAO: Record<Confianca, string> = {
  alta: "Estimativa — porção descrita com clareza",
  media: "Estimativa — porção aproximada",
  baixa: "Estimativa — porção não informada, assumida como usual",
};

/**
 * Rótulo de confiança adequado à origem do dado.
 *
 * A origem é dita junto porque "quanto isto é confiável?" e "de onde
 * veio?" são a mesma pergunta na tela: o que o atleta digitou é
 * estimativa dele, o que a foto produziu é estimativa do modelo, e só
 * a base nutricional fala em tabela.
 */
export function rotuloDeConfianca(
  confianca: Confianca,
  origem: "base" | "usuario" | "estimativa-ia",
  estimativa: "foto" | "texto" | "audio" | "plano" = "foto",
): string {
  if (origem === "estimativa-ia") {
    return estimativa === "foto"
      ? ROTULO_CONFIANCA_ESTIMATIVA[confianca]
      : ROTULO_CONFIANCA_DESCRICAO[confianca];
  }
  if (origem === "usuario") return "Estimativa sua — informada por você";
  return ROTULO_CONFIANCA[confianca];
}
