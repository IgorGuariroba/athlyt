/**
 * Catálogo de exercícios do Motor Adaptativo (specs/mvp-vertical.md,
 * user stories 18–20; ADR: motor híbrido com regras determinísticas).
 *
 * Assim como o catálogo de equipamentos, este é dado de domínio
 * versionado: um exercício ausente daqui é um exercício que o plano
 * não pode prescrever. Os ids são estáveis porque atravessam o banco
 * (Plano Ativo imutável) e a Trilha de Decisão; os nomes são a
 * superfície em pt-BR e podem mudar sem migração.
 *
 * `requer` é uma disjunção de conjunções: cada entrada é um conjunto
 * de equipamentos que, se totalmente disponível, viabiliza o
 * exercício. Lista vazia significa peso do corpo — sempre viável.
 */

import { EQUIPAMENTOS } from "@/domain/triagem/equipamentos";

export type GrupoMuscular =
  | "peito"
  | "costas"
  | "ombros"
  | "biceps"
  | "triceps"
  | "quadriceps"
  | "posteriores"
  | "gluteos"
  | "panturrilhas"
  | "core";

/**
 * Padrão de movimento — a unidade de estímulo que uma substituição
 * precisa preservar (user story 23: trocar sem descaracterizar o
 * bloco).
 */
export type PadraoMovimento =
  | "empurrar-horizontal"
  | "empurrar-vertical"
  | "puxar-horizontal"
  | "puxar-vertical"
  | "agachar"
  | "dobradica"
  | "extensao-joelho"
  | "flexao-joelho"
  | "elevacao-lateral"
  | "flexao-cotovelo"
  | "extensao-cotovelo"
  | "panturrilha"
  | "core";

/**
 * Região corporal citada em lesão. O plano evita exercícios que
 * carregam a região lesionada (user story 10).
 */
export type RegiaoCorporal =
  | "ombro"
  | "cotovelo"
  | "punho"
  | "lombar"
  | "quadril"
  | "joelho"
  | "tornozelo"
  | "cervical";

export interface DefinicaoExercicio {
  id: string;
  nome: string;
  padrao: PadraoMovimento;
  grupoPrimario: GrupoMuscular;
  /** Multiarticular: recebe mais séries e descanso mais longo. */
  composto: boolean;
  /** Disjunção de conjunções; vazio = peso do corpo. */
  requer: readonly (readonly string[])[];
  evitarSeLesaoEm: readonly RegiaoCorporal[];
  /**
   * Exige controle técnico sob carga axial ou instabilidade. O Modo
   * Conservador não prescreve estes: com perfil incompleto o sistema
   * não sabe o suficiente para liberar a capacidade (user story 14).
   */
  exigeTecnicaAvancada: boolean;
  /**
   * Ordem de preferência dentro do padrão — menor vem primeiro. É o
   * que torna a escolha determinística quando vários exercícios são
   * viáveis, sem depender da ordem do array.
   */
  prioridade: number;
  /** Por que este exercício existe no plano (user story 20). */
  justificativa: string;
}

export const EXERCICIOS: readonly DefinicaoExercicio[] = [
  // Empurrar horizontal — peito
  {
    id: "supino-barra",
    nome: "Supino reto com barra",
    padrao: "empurrar-horizontal",
    grupoPrimario: "peito",
    composto: true,
    requer: [["barra-olimpica", "anilhas", "banco-reto"]],
    evitarSeLesaoEm: ["ombro", "punho"],
    exigeTecnicaAvancada: true,
    prioridade: 1,
    justificativa:
      "Principal construtor de massa do peitoral e referência de força para acompanhar progressão ao longo do bloco.",
  },
  {
    id: "supino-halteres",
    nome: "Supino reto com halteres",
    padrao: "empurrar-horizontal",
    grupoPrimario: "peito",
    composto: true,
    requer: [["halteres", "banco-reto"], ["halteres", "banco-inclinado"]],
    evitarSeLesaoEm: ["ombro"],
    exigeTecnicaAvancada: false,
    prioridade: 2,
    justificativa:
      "Trabalha o peitoral com amplitude maior que a barra e permite ajustar o caminho do movimento ao seu ombro.",
  },
  {
    id: "supino-maquina-peito",
    nome: "Supino na máquina",
    padrao: "empurrar-horizontal",
    grupoPrimario: "peito",
    composto: true,
    requer: [["supino-maquina"], ["smith", "banco-reto"]],
    evitarSeLesaoEm: [],
    exigeTecnicaAvancada: false,
    prioridade: 3,
    justificativa:
      "Estímulo de peitoral com trajetória guiada, útil para acumular volume com baixa exigência de estabilização.",
  },
  {
    id: "flexao-de-braco",
    nome: "Flexão de braço",
    padrao: "empurrar-horizontal",
    grupoPrimario: "peito",
    composto: true,
    requer: [],
    evitarSeLesaoEm: ["punho"],
    exigeTecnicaAvancada: false,
    prioridade: 4,
    justificativa:
      "Empurrar horizontal sem equipamento, viável em qualquer local de treino.",
  },
  {
    id: "crucifixo-cabo",
    nome: "Crucifixo na polia",
    padrao: "empurrar-horizontal",
    grupoPrimario: "peito",
    composto: false,
    requer: [["crossover"], ["polia-alta"], ["voador"]],
    evitarSeLesaoEm: ["ombro"],
    exigeTecnicaAvancada: false,
    prioridade: 5,
    justificativa:
      "Isolamento do peitoral com tensão constante, complementando o volume dos compostos sem somar fadiga sistêmica.",
  },

  // Empurrar vertical — ombros
  {
    id: "desenvolvimento-halteres",
    nome: "Desenvolvimento com halteres",
    padrao: "empurrar-vertical",
    grupoPrimario: "ombros",
    composto: true,
    requer: [["halteres"]],
    evitarSeLesaoEm: ["ombro", "cervical"],
    exigeTecnicaAvancada: false,
    prioridade: 1,
    justificativa:
      "Constrói o deltoide anterior, que dá largura à parte alta do V característico do Men's Physique.",
  },
  {
    id: "desenvolvimento-maquina",
    nome: "Desenvolvimento na máquina",
    padrao: "empurrar-vertical",
    grupoPrimario: "ombros",
    composto: true,
    requer: [["smith"], ["supino-maquina"]],
    evitarSeLesaoEm: ["ombro", "cervical"],
    exigeTecnicaAvancada: false,
    prioridade: 2,
    justificativa:
      "Empurrar vertical guiado, que permite carga sem exigir estabilização de ombro.",
  },

  // Elevação lateral — ombros
  {
    id: "elevacao-lateral-halteres",
    nome: "Elevação lateral com halteres",
    padrao: "elevacao-lateral",
    grupoPrimario: "ombros",
    composto: false,
    requer: [["halteres"]],
    evitarSeLesaoEm: ["ombro"],
    exigeTecnicaAvancada: false,
    prioridade: 1,
    justificativa:
      "Deltoide lateral é o principal responsável pela largura de ombros julgada no Men's Physique.",
  },
  {
    id: "elevacao-lateral-elastico",
    nome: "Elevação lateral com elástico",
    padrao: "elevacao-lateral",
    grupoPrimario: "ombros",
    composto: false,
    requer: [["elasticos"], ["polia-baixa"]],
    evitarSeLesaoEm: ["ombro"],
    exigeTecnicaAvancada: false,
    prioridade: 2,
    justificativa:
      "Alternativa de deltoide lateral com resistência progressiva e baixa exigência de equipamento.",
  },

  // Puxar vertical — costas
  {
    id: "barra-fixa-pronada",
    nome: "Barra fixa pronada",
    padrao: "puxar-vertical",
    grupoPrimario: "costas",
    composto: true,
    requer: [["barra-fixa"]],
    evitarSeLesaoEm: ["ombro", "cotovelo"],
    exigeTecnicaAvancada: false,
    prioridade: 1,
    justificativa:
      "Constrói a dorsal alta, base da abertura do V. Padrão de puxada vertical com melhor retorno para o físico-alvo.",
  },
  {
    id: "puxada-polia",
    nome: "Puxada na polia alta",
    padrao: "puxar-vertical",
    grupoPrimario: "costas",
    composto: true,
    requer: [["polia-alta"]],
    evitarSeLesaoEm: ["ombro"],
    exigeTecnicaAvancada: false,
    prioridade: 2,
    justificativa:
      "Mesma puxada vertical da barra fixa com carga graduável, o que permite manter as repetições na faixa prescrita.",
  },
  {
    id: "puxada-elastico",
    nome: "Puxada vertical com elástico",
    padrao: "puxar-vertical",
    grupoPrimario: "costas",
    composto: true,
    requer: [["elasticos"]],
    evitarSeLesaoEm: ["ombro"],
    exigeTecnicaAvancada: false,
    prioridade: 3,
    justificativa:
      "Puxada vertical viável sem estrutura fixa, preservando o estímulo de dorsal.",
  },

  // Puxar horizontal — costas
  {
    id: "remada-curvada-barra",
    nome: "Remada curvada com barra",
    padrao: "puxar-horizontal",
    grupoPrimario: "costas",
    composto: true,
    requer: [["barra-olimpica", "anilhas"]],
    evitarSeLesaoEm: ["lombar", "ombro"],
    exigeTecnicaAvancada: true,
    prioridade: 1,
    justificativa:
      "Espessura de costas com carga alta; a posição inclinada exige lombar íntegra e técnica consolidada.",
  },
  {
    id: "remada-halteres",
    nome: "Remada unilateral com halter",
    padrao: "puxar-horizontal",
    grupoPrimario: "costas",
    composto: true,
    requer: [["halteres"]],
    evitarSeLesaoEm: ["ombro"],
    exigeTecnicaAvancada: false,
    prioridade: 2,
    justificativa:
      "Espessura de costas com apoio, o que reduz a carga sobre a lombar em relação à remada curvada.",
  },
  {
    id: "remada-maquina-sentada",
    nome: "Remada sentada na máquina",
    padrao: "puxar-horizontal",
    grupoPrimario: "costas",
    composto: true,
    requer: [["remada-maquina"], ["polia-baixa"]],
    evitarSeLesaoEm: ["ombro"],
    exigeTecnicaAvancada: false,
    prioridade: 3,
    justificativa:
      "Puxada horizontal com tronco apoiado, acumulando volume de costas sem sobrecarregar a lombar.",
  },
  {
    id: "remada-elastico",
    nome: "Remada com elástico",
    padrao: "puxar-horizontal",
    grupoPrimario: "costas",
    composto: true,
    requer: [["elasticos"]],
    evitarSeLesaoEm: [],
    exigeTecnicaAvancada: false,
    prioridade: 4,
    justificativa:
      "Puxada horizontal sem carga externa, mantendo o padrão no plano quando não há pesos.",
  },

  // Agachar — quadríceps
  {
    id: "agachamento-livre",
    nome: "Agachamento livre",
    padrao: "agachar",
    grupoPrimario: "quadriceps",
    composto: true,
    requer: [["barra-olimpica", "anilhas", "rack-agachamento"]],
    evitarSeLesaoEm: ["joelho", "lombar", "quadril"],
    exigeTecnicaAvancada: true,
    prioridade: 1,
    justificativa:
      "Maior estímulo global de membros inferiores; a carga axial exige coluna e joelhos sem restrição.",
  },
  {
    id: "leg-press-45",
    nome: "Leg press",
    padrao: "agachar",
    grupoPrimario: "quadriceps",
    composto: true,
    requer: [["leg-press"], ["hack-squat"]],
    evitarSeLesaoEm: ["joelho"],
    exigeTecnicaAvancada: false,
    prioridade: 2,
    justificativa:
      "Carga alta em quadríceps e glúteos sem compressão axial da coluna.",
  },
  {
    id: "agachamento-halteres",
    nome: "Agachamento com halteres",
    padrao: "agachar",
    grupoPrimario: "quadriceps",
    composto: true,
    requer: [["halteres"], ["kettlebell"]],
    evitarSeLesaoEm: ["joelho", "lombar"],
    exigeTecnicaAvancada: false,
    prioridade: 3,
    justificativa:
      "Padrão de agachamento com carga frontal, mais fácil de manter o tronco ereto do que com barra nas costas.",
  },
  {
    id: "agachamento-peso-corpo",
    nome: "Agachamento com peso do corpo",
    padrao: "agachar",
    grupoPrimario: "quadriceps",
    composto: true,
    requer: [],
    evitarSeLesaoEm: ["joelho"],
    exigeTecnicaAvancada: false,
    prioridade: 4,
    justificativa:
      "Mantém o padrão de agachamento no plano mesmo sem nenhum equipamento disponível.",
  },

  // Dobradiça — posteriores e glúteos
  {
    id: "levantamento-terra-romeno",
    nome: "Levantamento terra romeno",
    padrao: "dobradica",
    grupoPrimario: "posteriores",
    composto: true,
    requer: [["barra-olimpica", "anilhas"], ["halteres"]],
    evitarSeLesaoEm: ["lombar", "quadril"],
    exigeTecnicaAvancada: true,
    prioridade: 1,
    justificativa:
      "Principal exercício de posteriores de coxa e glúteo em alongamento; exige lombar íntegra e controle de quadril.",
  },
  {
    id: "elevacao-pelvica",
    nome: "Elevação pélvica",
    padrao: "dobradica",
    grupoPrimario: "gluteos",
    composto: true,
    requer: [["halteres"], ["banco-reto"], []],
    evitarSeLesaoEm: [],
    exigeTecnicaAvancada: false,
    prioridade: 2,
    justificativa:
      "Extensão de quadril com baixa exigência lombar, cobrindo glúteos quando a dobradiça em pé não é indicada.",
  },

  // Extensão de joelho
  {
    id: "cadeira-extensora-ex",
    nome: "Cadeira extensora",
    padrao: "extensao-joelho",
    grupoPrimario: "quadriceps",
    composto: false,
    requer: [["cadeira-extensora"]],
    evitarSeLesaoEm: ["joelho"],
    exigeTecnicaAvancada: false,
    prioridade: 1,
    justificativa:
      "Isola o quadríceps, permitindo volume adicional sem repetir a fadiga do agachamento.",
  },

  // Flexão de joelho
  {
    id: "mesa-flexora-ex",
    nome: "Mesa flexora",
    padrao: "flexao-joelho",
    grupoPrimario: "posteriores",
    composto: false,
    requer: [["mesa-flexora"]],
    evitarSeLesaoEm: ["joelho"],
    exigeTecnicaAvancada: false,
    prioridade: 1,
    justificativa:
      "Isola os posteriores na função de flexão de joelho, que a dobradiça sozinha não cobre.",
  },
  {
    id: "flexora-elastico",
    nome: "Flexão de joelho com elástico",
    padrao: "flexao-joelho",
    grupoPrimario: "posteriores",
    composto: false,
    requer: [["elasticos"]],
    evitarSeLesaoEm: ["joelho"],
    exigeTecnicaAvancada: false,
    prioridade: 2,
    justificativa:
      "Cobre a flexão de joelho sem máquina, mantendo o equilíbrio entre frente e trás da coxa.",
  },

  // Flexão de cotovelo — bíceps
  {
    id: "rosca-direta-halteres",
    nome: "Rosca direta com halteres",
    padrao: "flexao-cotovelo",
    grupoPrimario: "biceps",
    composto: false,
    requer: [["halteres"], ["barra-w", "anilhas"]],
    evitarSeLesaoEm: ["cotovelo"],
    exigeTecnicaAvancada: false,
    prioridade: 1,
    justificativa:
      "Braço é critério visível de julgamento; a rosca cobre o bíceps que os compostos de puxada não esgotam.",
  },
  {
    id: "rosca-elastico",
    nome: "Rosca com elástico",
    padrao: "flexao-cotovelo",
    grupoPrimario: "biceps",
    composto: false,
    requer: [["elasticos"], ["polia-baixa"]],
    evitarSeLesaoEm: ["cotovelo"],
    exigeTecnicaAvancada: false,
    prioridade: 2,
    justificativa:
      "Alternativa de bíceps com resistência elástica quando não há pesos livres.",
  },

  // Extensão de cotovelo — tríceps
  {
    id: "triceps-polia",
    nome: "Tríceps na polia",
    padrao: "extensao-cotovelo",
    grupoPrimario: "triceps",
    composto: false,
    requer: [["polia-alta"], ["crossover"]],
    evitarSeLesaoEm: ["cotovelo"],
    exigeTecnicaAvancada: false,
    prioridade: 1,
    justificativa:
      "Tríceps responde por boa parte do volume do braço; a polia mantém tensão constante com baixo risco articular.",
  },
  {
    id: "triceps-halteres",
    nome: "Extensão de tríceps com halteres",
    padrao: "extensao-cotovelo",
    grupoPrimario: "triceps",
    composto: false,
    requer: [["halteres"]],
    evitarSeLesaoEm: ["cotovelo", "ombro"],
    exigeTecnicaAvancada: false,
    prioridade: 2,
    justificativa:
      "Extensão de cotovelo com halteres, cobrindo o tríceps sem depender de polia.",
  },
  {
    id: "mergulho-banco",
    nome: "Mergulho no banco",
    padrao: "extensao-cotovelo",
    grupoPrimario: "triceps",
    composto: false,
    requer: [["paralelas"], ["banco-reto"], []],
    evitarSeLesaoEm: ["ombro", "cotovelo", "punho"],
    exigeTecnicaAvancada: false,
    prioridade: 3,
    justificativa:
      "Extensão de cotovelo com peso do corpo, disponível mesmo sem equipamento.",
  },

  // Panturrilha
  {
    id: "panturrilha-em-pe",
    nome: "Panturrilha em pé",
    padrao: "panturrilha",
    grupoPrimario: "panturrilhas",
    composto: false,
    requer: [["panturrilha-maquina"], ["halteres"], []],
    evitarSeLesaoEm: ["tornozelo"],
    exigeTecnicaAvancada: false,
    prioridade: 1,
    justificativa:
      "Panturrilha completa a proporção da perna e responde bem a volume frequente.",
  },

  // Core
  {
    id: "prancha",
    nome: "Prancha isométrica",
    padrao: "core",
    grupoPrimario: "core",
    composto: false,
    requer: [["colchonete"], []],
    evitarSeLesaoEm: ["lombar", "ombro"],
    exigeTecnicaAvancada: false,
    prioridade: 1,
    justificativa:
      "Estabilidade de tronco sustenta os compostos e protege a lombar sob carga.",
  },
];

const POR_ID = new Map(EXERCICIOS.map((e) => [e.id, e]));

export function encontrarExercicio(id: string): DefinicaoExercicio | undefined {
  return POR_ID.get(id);
}

/**
 * Invariante do catálogo: todo equipamento citado por um exercício
 * precisa existir no catálogo de equipamentos da triagem. Sem isso um
 * exercício viraria inalcançável silenciosamente — o usuário nunca
 * conseguiria marcar o equipamento que o habilita.
 */
export function equipamentosDesconhecidos(): string[] {
  const conhecidos = new Set(EQUIPAMENTOS.map((e) => e.id));
  const citados = new Set<string>();
  for (const exercicio of EXERCICIOS) {
    for (const conjunto of exercicio.requer) {
      for (const id of conjunto) if (!conhecidos.has(id)) citados.add(id);
    }
  }
  return [...citados].sort();
}

/**
 * Regiões corporais reconhecidas no texto livre de lesões. O casamento
 * é por palavra-chave e deliberadamente generoso: diante da dúvida, o
 * plano prefere evitar o exercício a arriscar a articulação.
 */
const TERMOS_REGIAO: ReadonlyArray<[RegiaoCorporal, readonly string[]]> = [
  ["ombro", ["ombro", "ombros", "manguito", "deltoide", "clavicula", "clavícula"]],
  ["cotovelo", ["cotovelo", "cotovelos", "epicondilite", "tendinite no braço"]],
  ["punho", ["punho", "punhos", "pulso", "pulsos", "tunel do carpo", "túnel do carpo"]],
  ["lombar", ["lombar", "lombalgia", "coluna", "hernia de disco", "hérnia de disco", "costas baixas"]],
  ["quadril", ["quadril", "quadris", "bacia", "sacro"]],
  ["joelho", ["joelho", "joelhos", "menisco", "patela", "ligamento cruzado", "condromalacia", "condromalácia"]],
  ["tornozelo", ["tornozelo", "tornozelos", "aquiles", "calcanhar"]],
  ["cervical", ["cervical", "pescoço", "pescoco", "nuca"]],
];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Extrai as regiões lesionadas do texto livre da triagem. Texto vazio
 * ou sem termo reconhecido devolve lista vazia — "sem lesões" e "lesão
 * que não sabemos nomear" convergem para o mesmo comportamento seguro
 * (nenhuma exclusão), porque inventar uma região a partir de texto
 * ambíguo excluiria exercícios sem base.
 */
export function regioesLesionadas(lesoes: string | undefined): RegiaoCorporal[] {
  if (!lesoes) return [];
  const texto = normalizar(lesoes);
  const regioes: RegiaoCorporal[] = [];
  for (const [regiao, termos] of TERMOS_REGIAO) {
    if (termos.some((termo) => texto.includes(normalizar(termo)))) {
      regioes.push(regiao);
    }
  }
  return regioes;
}

/**
 * Um exercício é viável quando algum de seus conjuntos de equipamento
 * está inteiramente disponível. Conjunto vazio (peso do corpo) é
 * sempre satisfeito — é o que garante que todo padrão tenha ao menos
 * uma saída, inclusive para quem treina sem equipamento.
 */
export function exercicioViavel(
  exercicio: DefinicaoExercicio,
  equipamentosDisponiveis: readonly string[],
): boolean {
  if (exercicio.requer.length === 0) return true;
  const disponiveis = new Set(equipamentosDisponiveis);
  return exercicio.requer.some((conjunto) =>
    conjunto.every((id) => disponiveis.has(id)),
  );
}

/**
 * Exercícios elegíveis para um contexto, na ordem canônica (padrão,
 * depois prioridade). Ordenar aqui — e não no gerador — é o que torna
 * a seleção reproduzível independentemente da ordem do catálogo.
 */
export function exerciciosElegiveis(entrada: {
  equipamentos: readonly string[];
  regioesLesionadas: readonly RegiaoCorporal[];
  modoConservador: boolean;
}): DefinicaoExercicio[] {
  const lesionadas = new Set(entrada.regioesLesionadas);
  return EXERCICIOS.filter((exercicio) => {
    if (!exercicioViavel(exercicio, entrada.equipamentos)) return false;
    if (exercicio.evitarSeLesaoEm.some((r) => lesionadas.has(r))) return false;
    if (entrada.modoConservador && exercicio.exigeTecnicaAvancada) return false;
    return true;
  }).sort((a, b) =>
    a.padrao === b.padrao
      ? a.prioridade - b.prioridade
      : a.padrao.localeCompare(b.padrao),
  );
}
