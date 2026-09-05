/**
 * Catálogo de exercícios do Motor Adaptativo híbrido, com regras
 * determinísticas.
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
import type { ModalidadeProtocolo } from "@/domain/sessao/protocolo-execucao";

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
  | "core"
  | "cardio";

/**
 * Padrão de movimento — a unidade de estímulo que uma substituição
 * precisa preservar para não descaracterizar o bloco.
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
  | "core"
  | "cardio";

/**
 * Região corporal citada em lesão. O plano evita exercícios que
 * carregam a região lesionada.
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
  /** Protocolo de registro da execução; ausente = repetições tradicional. */
  protocolo?: ModalidadeProtocolo;
  /** Disjunção de conjunções; vazio = peso do corpo. */
  requer: readonly (readonly string[])[];
  evitarSeLesaoEm: readonly RegiaoCorporal[];
  /**
   * Exige controle técnico sob carga axial ou instabilidade. O Modo
   * Conservador não prescreve estes: com perfil incompleto o sistema
   * não sabe o suficiente para liberar a capacidade.
   */
  exigeTecnicaAvancada: boolean;
  /**
   * Ordem de preferência dentro do padrão — menor vem primeiro. É o
   * que torna a escolha determinística quando vários exercícios são
   * viáveis, sem depender da ordem do array.
   */
  prioridade: number;
  /** Por que este exercício existe no plano. */
  justificativa: string;
  /**
   * Fallback em texto da Mídia de Execução: instrução objetiva de
   * como executar o movimento com boa técnica, usada
   * quando não há animação/vídeo disponível para o exercício.
   */
  comoExecutar: string;
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
    comoExecutar:
      "Deitado no banco, retraça as escápulas e mantenha os pés firmes no chão. Desça a barra até tocar levemente o peito, cotovelos a cerca de 45° do tronco, e empurre de volta sem travar bruscamente o cotovelo.",
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
    comoExecutar:
      "Deitado no banco com um halter em cada mão na altura do peito, empurre os halteres para cima até quase encostar um no outro, controlando a descida até sentir um leve alongamento no peitoral.",
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
    comoExecutar:
      "Ajuste o banco para que os punhos fiquem na altura do peito. Empurre os manípulos para frente em linha reta, sem tirar as costas do encosto, e retorne controlando o peso até o peitoral alongar.",
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
    comoExecutar:
      "Mãos um pouco além da largura dos ombros, corpo alinhado da cabeça aos calcanhares. Desça o tronco até o peito quase tocar o chão e empurre de volta sem deixar o quadril cair.",
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
    comoExecutar:
      "Polias na altura alta, um cabo em cada mão, tronco levemente inclinado à frente. Puxe as mãos em arco até se encontrarem à frente do peito, com cotovelos levemente flexionados, e retorne controlando o alongamento.",
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
    comoExecutar:
      "Sentado ou em pé, halteres na altura dos ombros, palmas voltadas à frente. Empurre para cima até quase estender o cotovelo, sem arquear a lombar, e desça até os halteres voltarem à altura dos ombros.",
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
    comoExecutar:
      "Sentado no equipamento com os apoios na altura dos ombros, empurre para cima em trajetória guiada até quase estender o cotovelo e retorne com controle até a posição inicial.",
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
    comoExecutar:
      "Em pé, um halter em cada mão ao lado do corpo, cotovelos levemente flexionados. Eleve os braços lateralmente até a altura dos ombros, sem usar impulso do tronco, e desça controlando o peso.",
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
    comoExecutar:
      "Pise o elástico ou prenda-o na polia baixa, um lado em cada mão. Eleve os braços lateralmente até a altura dos ombros, controlando a volta sem deixar o elástico puxar de repente.",
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
    comoExecutar:
      "Pegada pronada, um pouco além da largura dos ombros. Puxe o corpo para cima até o queixo passar a barra, levando os cotovelos para baixo e para trás, e desça com controle até os braços estenderem.",
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
    comoExecutar:
      "Sentado, joelhos presos sob o apoio, pegada pronada além da largura dos ombros. Puxe a barra até a altura do queixo levando os cotovelos para baixo, e retorne controlando o peso até o braço estender.",
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
    comoExecutar:
      "Prenda o elástico em um ponto alto, ajoelhado ou sentado abaixo dele. Puxe as mãos em direção ao peito levando os cotovelos para baixo e para trás, e retorne controlando a tensão do elástico.",
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
    comoExecutar:
      "Tronco inclinado à frente, joelhos levemente flexionados e coluna neutra. Puxe a barra em direção ao abdômen levando os cotovelos para trás, e desça com controle sem perder a inclinação do tronco.",
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
    comoExecutar:
      "Apoie um joelho e uma mão no banco, tronco paralelo ao chão. Puxe o halter em direção ao quadril levando o cotovelo para trás, e desça com controle até o braço estender.",
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
    comoExecutar:
      "Sentado, pés apoiados e tronco ereto, segure os punhos com os braços estendidos. Puxe em direção ao abdômen levando os cotovelos para trás e as escápulas juntas, e retorne controlando a extensão.",
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
    comoExecutar:
      "Prenda o elástico em um ponto fixo à altura do peito. Puxe as mãos em direção ao tronco levando os cotovelos para trás, mantendo a coluna neutra, e retorne controlando a tensão.",
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
    comoExecutar:
      "Barra apoiada no trapézio, pés na largura dos ombros. Desça flexionando quadril e joelhos até as coxas ficarem paralelas ao chão, mantendo o tronco ereto, e suba empurrando o chão com os pés.",
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
    comoExecutar:
      "Sentado no equipamento, pés na plataforma na largura dos ombros. Desça a plataforma flexionando os joelhos até um ângulo confortável, sem tirar a lombar do encosto, e empurre de volta sem travar o joelho.",
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
    comoExecutar:
      "Segure um halter em cada mão ao lado do corpo. Desça flexionando quadril e joelhos mantendo o tronco ereto, até as coxas ficarem próximas de paralelas ao chão, e suba empurrando o chão com os pés.",
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
    comoExecutar:
      "Pés na largura dos ombros, braços à frente para equilíbrio. Desça flexionando quadril e joelhos até as coxas ficarem paralelas ao chão, mantendo o tronco ereto, e suba empurrando o chão com os pés.",
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
    comoExecutar:
      "Barra apoiada à frente das coxas, joelhos levemente flexionados. Incline o tronco levando o quadril para trás, mantendo a barra próxima às pernas e a coluna neutra, até sentir alongar os posteriores, e retorne estendendo o quadril.",
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
    comoExecutar:
      "Costas apoiadas no banco, pés no chão na largura do quadril. Eleve o quadril até o tronco alinhar com as coxas, contraindo os glúteos no topo, e desça com controle sem tocar o chão entre repetições.",
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
    comoExecutar:
      "Sentado, costas apoiadas e joelhos alinhados com o eixo do equipamento. Estenda os joelhos até as pernas ficarem quase retas, e desça com controle sem deixar o peso bater no início do curso.",
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
    comoExecutar:
      "Deitado de bruços, calcanhares sob o apoio do equipamento. Flexione os joelhos trazendo os calcanhares em direção aos glúteos, e retorne com controle até as pernas estenderem.",
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
    comoExecutar:
      "Prenda o elástico no tornozelo e em um ponto fixo baixo, em pé ou apoiado. Flexione o joelho trazendo o calcanhar em direção ao glúteo, e retorne controlando a tensão do elástico.",
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
    comoExecutar:
      "Em pé, um halter em cada mão ao lado do corpo, cotovelos junto ao tronco. Flexione os cotovelos elevando os halteres até a altura dos ombros, sem balançar o tronco, e desça com controle até os braços estenderem.",
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
    comoExecutar:
      "Pise o elástico com os dois pés, segurando as extremidades com cotovelos junto ao tronco. Flexione os cotovelos elevando as mãos até a altura dos ombros, e desça controlando a tensão do elástico.",
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
    comoExecutar:
      "Em pé de frente para a polia alta, cotovelos junto ao tronco. Estenda os cotovelos empurrando a barra ou corda para baixo, sem afastar os cotovelos do corpo, e retorne com controle até o antebraço subir.",
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
    comoExecutar:
      "Sentado ou em pé, segure um halter com as duas mãos acima da cabeça. Flexione os cotovelos descendo o halter atrás da cabeça, mantendo os cotovelos apontados para frente, e estenda de volta.",
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
    comoExecutar:
      "Mãos apoiadas na borda de um banco atrás do corpo, pernas estendidas à frente. Flexione os cotovelos descendo o quadril em direção ao chão, e estenda de volta empurrando o banco com as mãos.",
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
    comoExecutar:
      "Em pé, apoie a ponta dos pés em uma superfície elevada ou no chão. Eleve os calcanhares o máximo possível, contraindo a panturrilha no topo, e desça com controle até sentir alongar.",
  },

  // Cardio
  {
    id: "corrida-esteira", nome: "Corrida na esteira", padrao: "cardio", grupoPrimario: "cardio", protocolo: "duracao", composto: false,
    requer: [[]], evitarSeLesaoEm: ["joelho", "tornozelo"], exigeTecnicaAvancada: false, prioridade: 1,
    justificativa: "Cardio acessível para desenvolver condicionamento em intensidade controlada.",
    comoExecutar: "Mantenha postura ereta, olhar à frente e passada confortável. Ajuste a velocidade para sustentar a duração sem perder a técnica.",
  },
  {
    id: "bicicleta-ergometrica", nome: "Bicicleta ergométrica", padrao: "cardio", grupoPrimario: "cardio", protocolo: "calorias", composto: false,
    requer: [[]], evitarSeLesaoEm: ["joelho"], exigeTecnicaAvancada: false, prioridade: 2,
    justificativa: "Alternativa de baixo impacto para elevar o gasto energético com controle de esforço.",
    comoExecutar: "Ajuste o banco para manter leve flexão do joelho no ponto mais baixo. Pedale de forma contínua.",
  },
  {
    id: "caminhada-esteira", nome: "Caminhada na esteira", padrao: "cardio", grupoPrimario: "cardio", protocolo: "distancia", composto: false,
    requer: [[]], evitarSeLesaoEm: ["joelho", "tornozelo"], exigeTecnicaAvancada: false, prioridade: 3,
    justificativa: "Cardio de baixo impacto para aumentar a atividade sem exigir alta complexidade técnica.",
    comoExecutar: "Caminhe com passadas naturais, tronco ereto e sem apoiar o peso nos braços da esteira.",
  },

  // Core
  {
    id: "prancha",
    nome: "Prancha isométrica",
    padrao: "core",
    grupoPrimario: "core",
    composto: false,
    protocolo: "tempo",
    requer: [["colchonete"], []],
    evitarSeLesaoEm: ["lombar", "ombro"],
    exigeTecnicaAvancada: false,
    prioridade: 1,
    justificativa:
      "Estabilidade de tronco sustenta os compostos e protege a lombar sob carga.",
    comoExecutar:
      "Apoie antebraços e pontas dos pés no chão, corpo alinhado da cabeça aos calcanhares. Contraia abdômen e glúteos mantendo o quadril na mesma altura dos ombros, sem deixar a lombar ceder.",
  },
];

const ROTULOS_GRUPO_MUSCULAR: Record<GrupoMuscular, string> = {
  peito: "Peito",
  costas: "Costas",
  ombros: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  quadriceps: "Quadríceps",
  posteriores: "Posteriores de coxa",
  gluteos: "Glúteos",
  panturrilhas: "Panturrilhas",
  core: "Core",
  cardio: "Cardio",
};

/** Rótulo em pt-BR do grupo muscular, para exibição na Ficha do Exercício. */
export function rotuloGrupoMuscular(grupo: GrupoMuscular): string {
  return ROTULOS_GRUPO_MUSCULAR[grupo];
}

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
const TERMOS_REGIAO: readonly [RegiaoCorporal, readonly string[]][] = [
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
