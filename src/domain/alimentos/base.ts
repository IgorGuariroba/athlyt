/**
 * Base nutricional auditável.
 *
 * Dado de domínio versionado, como o catálogo de exercícios: um
 * alimento ausente daqui é um alimento que a busca não encontra — e o
 * caminho para ele é a entrada manual, não um valor
 * inventado. Os ids são estáveis porque atravessam o banco (um
 * Consumo Confirmado guarda o id do que foi comido).
 *
 * Os valores são por 100 g da porção comestível, na forma de preparo
 * indicada no nome. Cada alimento declara a fonte, a versão e a data
 * para o cálculo continuar auditável; sem isso, a ponderação de fontes
 * conflitantes não teria em que se apoiar.
 *
 * Fontes usadas: TBCA (Tabela Brasileira de Composição de Alimentos,
 * USP) e TACO (Unicamp), ambas tabelas analíticas públicas. Valores
 * arredondados para inteiros: a precisão decimal seria falsa, dada a
 * variabilidade natural do alimento.
 */

import type { Macros } from "@/domain/diario/tipos";
import type { Confianca, TipoFonte } from "./proveniencia";

export interface Proveniencia {
  fonte: string;
  tipo: TipoFonte;
  versao: string;
  atualizadaEm: string;
}

export interface Porcao {
  /** Rótulo exibido: "colher de sopa", "fatia", "unidade média". */
  unidade: string;
  /** Peso equivalente em gramas — é o que torna a conta auditável. */
  gramas: number;
}

export interface Alimento {
  id: string;
  nome: string;
  /** Termos alternativos pelos quais o atleta pode procurar. */
  sinonimos: readonly string[];
  /** Macros por 100 g de porção comestível. */
  por100g: Macros;
  /**
   * Composição por 100 ml, quando a referência analítica é volume.
   * Explícita de propósito: copiar `por100g` para um líquido fingiria
   * uma densidade de 1 g/ml que a fonte não declarou.
   */
  por100ml?: Macros;
  porcoes: readonly Porcao[];
  proveniencia: Proveniencia;
  confianca: Confianca;
}

const TBCA: Proveniencia = {
  fonte: "TBCA — Tabela Brasileira de Composição de Alimentos (USP)",
  tipo: "tabela-oficial",
  versao: "7.2",
  atualizadaEm: "2023-06-01",
};

const TACO: Proveniencia = {
  fonte: "TACO — Tabela de Composição de Alimentos (Unicamp)",
  tipo: "tabela-oficial",
  versao: "4",
  atualizadaEm: "2011-01-01",
};

function macros(
  calorias: number,
  proteinaG: number,
  carboidratosG: number,
  gordurasG: number,
  fibrasG: number,
): Macros {
  return { calorias, proteinaG, carboidratosG, gordurasG, fibrasG };
}

/**
 * Recorte inicial cobrindo os alimentos que o gerador de cardápio já
 * prescreve, mais os básicos do dia a dia brasileiro. A base cresce
 * por demanda observada, não por antecipação.
 */
export const BASE_ALIMENTOS: readonly Alimento[] = [
  {
    id: "arroz-branco-cozido",
    nome: "Arroz branco cozido",
    sinonimos: ["arroz"],
    por100g: macros(128, 2, 28, 0, 1),
    porcoes: [
      { unidade: "colher de sopa", gramas: 25 },
      { unidade: "escumadeira", gramas: 100 },
    ],
    proveniencia: TBCA,
    confianca: "alta",
  },
  {
    id: "feijao-carioca-cozido",
    nome: "Feijão carioca cozido",
    sinonimos: ["feijao", "feijão"],
    por100g: macros(76, 5, 14, 1, 8),
    porcoes: [
      { unidade: "concha", gramas: 80 },
      { unidade: "colher de sopa", gramas: 30 },
    ],
    proveniencia: TBCA,
    confianca: "alta",
  },
  {
    id: "peito-frango-grelhado",
    nome: "Peito de frango grelhado",
    sinonimos: ["frango", "peito de frango"],
    por100g: macros(159, 32, 0, 3, 0),
    porcoes: [
      { unidade: "filé médio", gramas: 100 },
      { unidade: "posta", gramas: 150 },
    ],
    proveniencia: TBCA,
    confianca: "alta",
  },
  {
    id: "ovo-de-galinha-cozido",
    nome: "Ovo de galinha cozido",
    sinonimos: ["ovo", "ovos"],
    por100g: macros(146, 13, 1, 10, 0),
    porcoes: [{ unidade: "unidade", gramas: 50 }],
    proveniencia: TBCA,
    confianca: "alta",
  },
  {
    id: "aveia-em-flocos",
    nome: "Aveia em flocos",
    sinonimos: ["aveia"],
    por100g: macros(394, 14, 67, 8, 9),
    porcoes: [{ unidade: "colher de sopa", gramas: 15 }],
    proveniencia: TACO,
    confianca: "alta",
  },
  {
    id: "banana-prata",
    nome: "Banana prata",
    sinonimos: ["banana"],
    por100g: macros(98, 1, 26, 0, 2),
    porcoes: [{ unidade: "unidade média", gramas: 70 }],
    proveniencia: TACO,
    confianca: "alta",
  },
  {
    id: "batata-inglesa-cozida",
    nome: "Batata inglesa cozida",
    sinonimos: ["batata"],
    por100g: macros(52, 1, 12, 0, 1),
    porcoes: [{ unidade: "unidade média", gramas: 120 }],
    proveniencia: TACO,
    confianca: "alta",
  },
  {
    id: "pao-frances",
    nome: "Pão francês",
    sinonimos: ["pao", "pão", "pãozinho"],
    por100g: macros(300, 8, 59, 3, 2),
    porcoes: [{ unidade: "unidade", gramas: 50 }],
    proveniencia: TACO,
    confianca: "alta",
  },
  {
    id: "leite-integral",
    nome: "Leite integral",
    sinonimos: ["leite"],
    por100g: macros(61, 3, 5, 3, 0),
    por100ml: macros(61, 3, 5, 3, 0),
    porcoes: [
      { unidade: "copo (200 ml)", gramas: 200 },
      { unidade: "xícara (250 ml)", gramas: 250 },
    ],
    proveniencia: TBCA,
    confianca: "alta",
  },
  {
    id: "iogurte-natural-integral",
    nome: "Iogurte natural integral",
    sinonimos: ["iogurte"],
    por100g: macros(61, 4, 5, 3, 0),
    porcoes: [{ unidade: "pote (170 g)", gramas: 170 }],
    proveniencia: TBCA,
    confianca: "alta",
  },
  {
    id: "carne-bovina-patinho-grelhado",
    nome: "Carne bovina patinho grelhado",
    sinonimos: ["carne", "patinho", "carne bovina"],
    por100g: macros(219, 35, 0, 8, 0),
    porcoes: [{ unidade: "bife médio", gramas: 100 }],
    proveniencia: TBCA,
    confianca: "alta",
  },
  {
    id: "tapioca-goma-hidratada",
    nome: "Tapioca (goma hidratada)",
    sinonimos: ["tapioca", "goma"],
    por100g: macros(240, 0, 60, 0, 1),
    porcoes: [{ unidade: "unidade média", gramas: 80 }],
    proveniencia: TACO,
    confianca: "media",
  },
  {
    id: "pasta-de-amendoim-integral",
    nome: "Pasta de amendoim integral",
    sinonimos: ["pasta de amendoim", "amendoim"],
    por100g: macros(589, 25, 20, 50, 8),
    porcoes: [{ unidade: "colher de sopa", gramas: 20 }],
    proveniencia: TACO,
    confianca: "media",
  },
  {
    id: "whey-protein-concentrado",
    nome: "Whey protein concentrado",
    sinonimos: ["whey", "proteina em po", "proteína em pó"],
    por100g: macros(400, 80, 8, 6, 0),
    porcoes: [{ unidade: "scoop (30 g)", gramas: 30 }],
    // Composição varia por marca: o rótulo é a fonte, e ela é menos
    // reprodutível que uma tabela analítica.
    proveniencia: {
      fonte: "Rótulo do fabricante (valor típico de mercado)",
      tipo: "rotulo",
      versao: "2024",
      atualizadaEm: "2024-01-01",
    },
    confianca: "media",
  },
  {
    id: "azeite-de-oliva",
    nome: "Azeite de oliva",
    sinonimos: ["azeite", "oleo de oliva", "óleo de oliva"],
    por100g: macros(884, 0, 0, 100, 0),
    porcoes: [{ unidade: "colher de sopa", gramas: 13 }],
    proveniencia: TBCA,
    confianca: "alta",
  },
  {
    id: "salada-folhas-verdes",
    nome: "Salada de folhas verdes",
    sinonimos: ["salada", "alface", "folhas"],
    por100g: macros(15, 1, 2, 0, 2),
    porcoes: [{ unidade: "prato de sobremesa", gramas: 80 }],
    proveniencia: TACO,
    confianca: "media",
  },
];

const POR_ID = new Map(BASE_ALIMENTOS.map((a) => [a.id, a]));

export function encontrarAlimento(id: string): Alimento | undefined {
  return POR_ID.get(id);
}

/**
 * Correspondência segura para cálculo automático. Diferente da busca
 * da UI, não aceita prefixo nem trecho: uma estimativa assumida é
 * preferível a atribuir a tabela do alimento errado.
 */
export function encontrarAlimentoPorNomeExato(nome: string): Alimento | undefined {
  const alvo = normalizar(nome);
  return BASE_ALIMENTOS.find((alimento) =>
    [alimento.nome, ...alimento.sinonimos].some((termo) => normalizar(termo) === alvo),
  );
}

export function porcoesDoAlimento(id: string): readonly Porcao[] {
  const alimento = POR_ID.get(id);
  // Gramas sempre existe como unidade universal; as porções caseiras
  // são atalhos por cima dela.
  return alimento ? [{ unidade: "g", gramas: 1 }, ...alimento.porcoes] : [];
}

/** Remove acentos para que "feijao" encontre "Feijão". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Busca por nome ou sinônimo. Quem começa com o termo vem antes de
 * quem apenas o contém — digitar "arroz" e receber "Arroz branco" em
 * terceiro lugar seria um resultado tecnicamente correto e inútil.
 */
export function buscarAlimentos(termo: string): Alimento[] {
  const alvo = normalizar(termo);
  if (alvo.length === 0) return [];
  const pontuados = BASE_ALIMENTOS.flatMap((alimento) => {
    const campos = [alimento.nome, ...alimento.sinonimos].map(normalizar);
    const prefixo = campos.some((campo) => campo.startsWith(alvo));
    const contem = campos.some((campo) => campo.includes(alvo));
    if (!contem) return [];
    return [{ alimento, posicao: prefixo ? 0 : 1 }];
  });
  return pontuados
    .sort((a, b) => a.posicao - b.posicao || a.alimento.nome.localeCompare(b.alimento.nome, "pt-BR"))
    .map((p) => p.alimento);
}

export interface QuantidadeInformada {
  quantidade: number;
  unidade: string;
}

/**
 * Macros de uma quantidade informada. A conta passa sempre por gramas,
 * inclusive para unidades caseiras — é isso que mantém o cálculo
 * auditável e faz "1 concha" e "80 g" darem o mesmo resultado.
 */
export function macrosDaPorcao(alimento: Alimento, entrada: QuantidadeInformada): Macros {
  if (entrada.quantidade < 0) {
    throw new Error("Quantidade negativa não representa consumo.");
  }
  const porcao = porcoesDoAlimento(alimento.id).find((p) => p.unidade === entrada.unidade);
  if (!porcao) {
    throw new Error(`Unidade desconhecida para ${alimento.nome}: ${entrada.unidade}.`);
  }
  const gramas = entrada.quantidade * porcao.gramas;
  const fator = gramas / 100;
  return {
    calorias: Math.round(alimento.por100g.calorias * fator),
    proteinaG: Math.round(alimento.por100g.proteinaG * fator),
    carboidratosG: Math.round(alimento.por100g.carboidratosG * fator),
    gordurasG: Math.round(alimento.por100g.gordurasG * fator),
    fibrasG: Math.round(alimento.por100g.fibrasG * fator),
  };
}

/**
 * Calcula diretamente na unidade nutricional já padronizada.
 * Mililitros só são aceitos quando a própria fonte traz `por100ml`;
 * nunca são convertidos em gramas por densidade implícita.
 */
export function macrosPorQuantidadeNutricional(
  alimento: Alimento,
  quantidade: number,
  unidade: "g" | "ml",
): Macros | null {
  const referencia = unidade === "ml" ? alimento.por100ml : alimento.por100g;
  if (!referencia || !Number.isFinite(quantidade) || quantidade <= 0) return null;
  const fator = quantidade / 100;
  return {
    calorias: Math.round(referencia.calorias * fator),
    proteinaG: Math.round(referencia.proteinaG * fator),
    carboidratosG: Math.round(referencia.carboidratosG * fator),
    gordurasG: Math.round(referencia.gordurasG * fator),
    fibrasG: Math.round(referencia.fibrasG * fator),
  };
}

/** Descrição legível do item, como aparece na linha do tempo. */
export function descreverPorcao(alimento: Alimento, entrada: QuantidadeInformada): string {
  const quantidade = Number.isInteger(entrada.quantidade)
    ? String(entrada.quantidade)
    : entrada.quantidade.toFixed(2).replace(/0$/, "").replace(".", ",");
  return entrada.unidade === "g"
    ? `${alimento.nome} ${quantidade} g`
    : `${alimento.nome} ${quantidade} ${entrada.unidade}`;
}
