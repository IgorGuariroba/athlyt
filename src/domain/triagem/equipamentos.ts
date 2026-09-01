/**
 * Catálogo de equipamentos da triagem.
 *
 * O plano de treino é gerado a partir desta lista: um equipamento
 * ausente aqui é um exercício que a IA não pode prescrever. Por isso o
 * catálogo é um dado de domínio versionado, não um array de rótulos na
 * página — o mesmo `id` identifica o equipamento na triagem, no
 * Contexto do Atleta e em futuras telas de edição do perfil.
 *
 * Os ids são estáveis e em inglês minúsculo-hífen porque atravessam o
 * banco e o prompt; os rótulos são a superfície em pt-BR e podem mudar
 * sem migração.
 */

import { EQUIPAMENTOS_REPDB } from "./equipamentos-repdb";

export type CategoriaEquipamentoId =
  | "pesos-livres"
  | "bancos-e-suportes"
  | "maquinas"
  | "cabos"
  | "acessorios"
  | "cardio";

export interface DefinicaoEquipamento {
  id: string;
  rotulo: string;
  categoria: CategoriaEquipamentoId;
  /**
   * Presente por padrão nos locais listados. É o que permite pré-marcar
   * uma seleção plausível em vez de entregar uma lista vazia — o Fitbod
   * chama isso de "selecionamos estes com base em onde você treina".
   *
   * Lista vazia é deliberada e significa "existe no catálogo, mas não
   * se presume em lugar nenhum": equipamento comum o bastante para ser
   * oferecido, raro o bastante para que marcá-lo por padrão produza um
   * plano com exercício inviável. Sugerir tudo equivale a não sugerir
   * nada — a revisão só tem valor se a sugestão puder estar errada.
   */
  presentePor: readonly LocalTreinoId[];
}

export type LocalTreinoId =
  | "academia-completa"
  | "condominio"
  | "casa"
  | "sem-equipamentos";

export interface DefinicaoCategoria {
  id: CategoriaEquipamentoId;
  rotulo: string;
}

export const CATEGORIAS_EQUIPAMENTO: readonly DefinicaoCategoria[] = [
  { id: "pesos-livres", rotulo: "Pesos livres" },
  { id: "bancos-e-suportes", rotulo: "Bancos e suportes" },
  { id: "maquinas", rotulo: "Máquinas" },
  { id: "cabos", rotulo: "Cabos e polias" },
  { id: "acessorios", rotulo: "Acessórios" },
  { id: "cardio", rotulo: "Cardio" },
];

const TODAS = [
  "academia-completa",
  "condominio",
  "casa",
] as const satisfies readonly LocalTreinoId[];

const ACADEMIAS = [
  "academia-completa",
  "condominio",
] as const satisfies readonly LocalTreinoId[];

const SO_COMPLETA = [
  "academia-completa",
] as const satisfies readonly LocalTreinoId[];

/** Existe no catálogo, não se presume em nenhum local. */
const NENHUM = [] as const satisfies readonly LocalTreinoId[];

export const EQUIPAMENTOS: readonly DefinicaoEquipamento[] = [
  // Pesos livres
  { id: "halteres", rotulo: "Halteres", categoria: "pesos-livres", presentePor: TODAS },
  { id: "barra-olimpica", rotulo: "Barra olímpica", categoria: "pesos-livres", presentePor: ACADEMIAS },
  { id: "barra-w", rotulo: "Barra W", categoria: "pesos-livres", presentePor: ACADEMIAS },
  { id: "anilhas", rotulo: "Anilhas", categoria: "pesos-livres", presentePor: ACADEMIAS },
  { id: "kettlebell", rotulo: "Kettlebell", categoria: "pesos-livres", presentePor: ACADEMIAS },

  // Bancos e suportes
  { id: "banco-reto", rotulo: "Banco reto", categoria: "bancos-e-suportes", presentePor: ACADEMIAS },
  { id: "banco-inclinado", rotulo: "Banco ajustável", categoria: "bancos-e-suportes", presentePor: ACADEMIAS },
  { id: "rack-agachamento", rotulo: "Rack de agachamento", categoria: "bancos-e-suportes", presentePor: SO_COMPLETA },
  { id: "barra-fixa", rotulo: "Barra fixa", categoria: "bancos-e-suportes", presentePor: ACADEMIAS },
  { id: "paralelas", rotulo: "Paralelas", categoria: "bancos-e-suportes", presentePor: ACADEMIAS },

  // Máquinas
  { id: "leg-press", rotulo: "Leg press", categoria: "maquinas", presentePor: SO_COMPLETA },
  { id: "cadeira-extensora", rotulo: "Cadeira extensora", categoria: "maquinas", presentePor: SO_COMPLETA },
  { id: "mesa-flexora", rotulo: "Mesa flexora", categoria: "maquinas", presentePor: SO_COMPLETA },
  { id: "supino-maquina", rotulo: "Supino máquina", categoria: "maquinas", presentePor: SO_COMPLETA },
  { id: "voador", rotulo: "Voador / crucifixo", categoria: "maquinas", presentePor: SO_COMPLETA },
  { id: "remada-maquina", rotulo: "Remada máquina", categoria: "maquinas", presentePor: SO_COMPLETA },
  { id: "panturrilha-maquina", rotulo: "Panturrilha máquina", categoria: "maquinas", presentePor: NENHUM },
  { id: "hack-squat", rotulo: "Hack squat", categoria: "maquinas", presentePor: NENHUM },
  { id: "smith", rotulo: "Máquina Smith", categoria: "maquinas", presentePor: NENHUM },

  // Cabos e polias
  { id: "polia-alta", rotulo: "Polia alta (pulley)", categoria: "cabos", presentePor: SO_COMPLETA },
  { id: "polia-baixa", rotulo: "Polia baixa", categoria: "cabos", presentePor: SO_COMPLETA },
  { id: "crossover", rotulo: "Crossover", categoria: "cabos", presentePor: NENHUM },

  // Acessórios
  { id: "elasticos", rotulo: "Elásticos", categoria: "acessorios", presentePor: TODAS },
  { id: "trx", rotulo: "TRX / fitas de suspensão", categoria: "acessorios", presentePor: NENHUM },
  { id: "corda-naval", rotulo: "Corda naval", categoria: "acessorios", presentePor: NENHUM },
  { id: "bola-suica", rotulo: "Bola suíça", categoria: "acessorios", presentePor: NENHUM },
  { id: "colchonete", rotulo: "Colchonete", categoria: "acessorios", presentePor: TODAS },

  // Cardio
  { id: "esteira", rotulo: "Esteira", categoria: "cardio", presentePor: ACADEMIAS },
  { id: "bicicleta", rotulo: "Bicicleta ergométrica", categoria: "cardio", presentePor: ACADEMIAS },
  { id: "eliptico", rotulo: "Elíptico", categoria: "cardio", presentePor: NENHUM },
  { id: "remo-ergometro", rotulo: "Remo ergômetro", categoria: "cardio", presentePor: NENHUM },

  // Tipos adicionais importados do catálogo RepDB.
  ...EQUIPAMENTOS_REPDB,
];

const POR_ID = new Map(EQUIPAMENTOS.map((e) => [e.id, e]));

export function isEquipamentoId(valor: string): boolean {
  return POR_ID.has(valor);
}

export function rotuloEquipamento(id: string): string | undefined {
  return POR_ID.get(id)?.rotulo;
}

/**
 * Caminho estável da miniatura vetorial monocromática do equipamento.
 * Derivá-lo do id impede que catálogo e pasta de imagens divirjam por
 * um segundo identificador mantido à mão.
 */
export function imagemEquipamento(id: string): string {
  return `/equipamentos/${id}.svg`;
}

/**
 * Sugestão inicial para um local de treino. "Sugestão" é literal: o
 * usuário revisa e ajusta, como nas referências. Um local sem
 * equipamentos (peso do corpo) devolve lista vazia — estado válido,
 * não ausência de resposta.
 */
export function equipamentosSugeridos(local: LocalTreinoId): string[] {
  if (local === "sem-equipamentos") return [];
  return EQUIPAMENTOS.filter((e) =>
    (e.presentePor as readonly string[]).includes(local),
  ).map((e) => e.id);
}

/** Equipamentos de uma categoria, na ordem canônica do catálogo. */
export function equipamentosDaCategoria(
  categoria: CategoriaEquipamentoId,
): readonly DefinicaoEquipamento[] {
  return EQUIPAMENTOS.filter((e) => e.categoria === categoria);
}
