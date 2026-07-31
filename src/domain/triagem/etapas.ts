/**
 * Perfil e Triagem — modelo de dados e cascata de etapas
 * (specs/mvp-vertical.md, user stories 5–13; specs/workflow/telas
 * 004–010, 016–024). A Importação de Histórico (telas 011–015) fica
 * fora desta fatia — ver ticket "Importação de Histórico".
 *
 * Cada etapa é uma pergunta por tela. Uma etapa é considerada
 * "respondida" quando todas as suas `campos` existem em
 * `RespostasTriagem` — mesmo que o valor seja vazio ("sem lesões",
 * "sem restrições"), o que distingue uma resposta explícita de
 * "nenhuma" de uma etapa ainda não visitada.
 */

export type SexoBiologico = "masculino" | "feminino";

export type ExperienciaTreino =
  | "nunca-treinou"
  | "iniciante"
  | "intermediario"
  | "avancado";

export type DiaSemana =
  | "segunda"
  | "terca"
  | "quarta"
  | "quinta"
  | "sexta"
  | "sabado"
  | "domingo";

export type LocalTreino =
  | "academia-completa"
  | "condominio"
  | "casa"
  | "sem-equipamentos";

export type NivelAtividade =
  | "sedentario"
  | "leve"
  | "moderado"
  | "ativo"
  | "muito-ativo";

export type ObjetivoComposicao =
  | "recomposicao"
  | "perder-gordura"
  | "ganhar-massa";

/**
 * Snapshot completo do perfil de triagem. Cada campo é opcional
 * porque a cascata é progressiva — o snapshot mais recente é sempre
 * um merge de todas as respostas já dadas.
 */
export interface RespostasTriagem {
  dataNascimento?: string;
  sexoBiologico?: SexoBiologico;
  alturaCm?: number;
  pesoKg?: number;
  objetivoComposicao?: ObjetivoComposicao;
  /** Compatibilidade com perfis registrados antes da seleção de objetivo. */
  objetivoConfirmado?: boolean;
  experienciaTreino?: ExperienciaTreino;
  diasDisponiveis?: DiaSemana[];
  duracaoSessaoMin?: number;
  localTreino?: LocalTreino;
  /** IDs estáveis dos itens presentes no catálogo canônico. */
  equipamentos?: string[];
  /**
   * Nomes livres informados pelo atleta quando a academia possui algo
   * que ainda não existe no catálogo. Separar nomes de ids evita que a
   * validação confunda texto humano com uma identidade canônica.
   */
  equipamentosPersonalizados?: string[];
  lesoes?: string;
  condicoes?: string;
  restricoesAlimentares?: string[];
  orcamentoAlimentar?: "baixo" | "medio" | "alto";
  tempoPreparoMin?: number;
  nivelAtividade?: NivelAtividade;
  horasSono?: number;
}

export type EtapaId =
  | "idade"
  | "sexo"
  | "altura"
  | "peso"
  | "objetivo"
  | "experiencia"
  | "disponibilidade"
  | "duracao-sessao"
  | "academia-equipamentos"
  | "saude-lesoes"
  | "saude-condicoes"
  | "alimentacao-restricoes"
  | "alimentacao-logistica"
  | "rotina-sono";

export interface DefinicaoEtapa {
  id: EtapaId;
  titulo: string;
  campos: (keyof RespostasTriagem)[];
  /**
   * Etapas obrigatórias formam o mínimo para sair do Modo
   * Conservador (specs/mvp-vertical.md: "Modo Conservador ... estado
   * explícito derivado da suficiência ... dos dados"). Etapas
   * complementares refinam o plano mas não bloqueiam a suficiência.
   */
  obrigatoria: boolean;
  destrava: string;
}

/**
 * Ordem canônica da cascata (specs/workflow/telas 005–010,
 * 016–023). A tela 004 (introdução) e 024 (resumo) não são etapas de
 * dados — são a moldura da cascata.
 */
export const ETAPAS_TRIAGEM: readonly DefinicaoEtapa[] = [
  {
    id: "idade",
    titulo: "Idade",
    campos: ["dataNascimento"],
    obrigatoria: true,
    destrava: "Cálculo de necessidades energéticas ajustado à idade",
  },
  {
    id: "sexo",
    titulo: "Sexo biológico",
    campos: ["sexoBiologico"],
    obrigatoria: true,
    destrava: "Estimativas contextualizadas para os cálculos do plano",
  },
  {
    id: "altura",
    titulo: "Altura",
    campos: ["alturaCm"],
    obrigatoria: true,
    destrava: "Cálculo de proporções e necessidades energéticas",
  },
  {
    id: "peso",
    titulo: "Peso atual",
    campos: ["pesoKg"],
    obrigatoria: true,
    destrava: "Linha de base para acompanhar tendência de peso",
  },
  {
    id: "objetivo",
    titulo: "Objetivo",
    campos: ["objetivoComposicao"],
    obrigatoria: true,
    destrava: "Priorização de proporções, desempenho e composição corporal",
  },
  {
    id: "experiencia",
    titulo: "Experiência de treino",
    campos: ["experienciaTreino"],
    obrigatoria: true,
    destrava: "Bloco de treino compatível com seu nível atual",
  },
  {
    id: "disponibilidade",
    titulo: "Disponibilidade semanal",
    campos: ["diasDisponiveis"],
    obrigatoria: true,
    destrava: "Divisão de treino executável na sua rotina",
  },
  {
    id: "duracao-sessao",
    titulo: "Duração da sessão",
    campos: ["duracaoSessaoMin"],
    obrigatoria: true,
    destrava: "Volume de treino cabível no tempo que você tem",
  },
  {
    id: "academia-equipamentos",
    titulo: "Academia e equipamentos",
    campos: ["localTreino", "equipamentos"],
    obrigatoria: true,
    destrava: "Exercícios viáveis com o que você tem disponível",
  },
  {
    id: "saude-lesoes",
    titulo: "Lesões e desconfortos",
    campos: ["lesoes"],
    obrigatoria: false,
    destrava: "Plano evita exercícios contraindicados por lesão",
  },
  {
    id: "saude-condicoes",
    titulo: "Condições e medicamentos",
    campos: ["condicoes"],
    obrigatoria: false,
    destrava: "Plano contextualizado por riscos de saúde informados",
  },
  {
    id: "alimentacao-restricoes",
    titulo: "Preferências e restrições alimentares",
    campos: ["restricoesAlimentares"],
    obrigatoria: false,
    destrava: "Cardápio respeitando suas preferências e restrições",
  },
  {
    id: "alimentacao-logistica",
    titulo: "Orçamento e preparo",
    campos: ["orcamentoAlimentar", "tempoPreparoMin"],
    obrigatoria: false,
    destrava: "Cardápio praticável no seu orçamento e tempo",
  },
  {
    id: "rotina-sono",
    titulo: "Rotina, sono e atividade",
    campos: ["nivelAtividade", "horasSono"],
    obrigatoria: false,
    destrava: "Ajuste de recuperação e gasto energético mais preciso",
  },
] as const;

export function encontrarEtapa(id: EtapaId): DefinicaoEtapa {
  const etapa = ETAPAS_TRIAGEM.find((e) => e.id === id);
  if (!etapa) {
    throw new Error(`Etapa de triagem desconhecida: ${id}`);
  }
  return etapa;
}

const IDS_ETAPAS = new Set<string>(ETAPAS_TRIAGEM.map((e) => e.id));

/** Type guard para validar um segmento de rota como `EtapaId` conhecido. */
export function isEtapaId(valor: string): valor is EtapaId {
  return IDS_ETAPAS.has(valor);
}

/** Índice (1-based) e total de etapas — base da barra de progresso da cascata. */
export function posicaoNaCascata(id: EtapaId): {
  indice: number;
  total: number;
} {
  const indice = ETAPAS_TRIAGEM.findIndex((e) => e.id === id);
  return { indice: indice + 1, total: ETAPAS_TRIAGEM.length };
}

/** Etapa anterior na ordem fixa da cascata, ou `null` na primeira etapa. */
export function etapaAnterior(id: EtapaId): EtapaId | null {
  const indice = ETAPAS_TRIAGEM.findIndex((e) => e.id === id);
  return indice > 0 ? ETAPAS_TRIAGEM[indice - 1].id : null;
}

/** Próxima etapa na ordem fixa da cascata, ou `null` após a última. */
export function etapaSeguinte(id: EtapaId): EtapaId | null {
  const indice = ETAPAS_TRIAGEM.findIndex((e) => e.id === id);
  return indice >= 0 && indice < ETAPAS_TRIAGEM.length - 1
    ? ETAPAS_TRIAGEM[indice + 1].id
    : null;
}

/**
 * Como `etapaSeguinte`, mas devolve `"resumo"` após a última etapa —
 * o destino da server action e do form da cascata (specs/workflow/
 * telas/024-resumo-triagem.md é a moldura seguinte à última
 * pergunta).
 */
export function proximoDestinoCascata(id: EtapaId): EtapaId | "resumo" {
  return etapaSeguinte(id) ?? "resumo";
}

/**
 * Opções canônicas para os campos de seleção múltipla da cascata
 * (specs/workflow/telas 018, 021). Mantidas junto ao domínio para que
 * a triagem e futuras telas de edição (Mais > Perfil) usem a mesma
 * lista.
 */
export const RESTRICOES_ALIMENTARES_COMUNS: readonly string[] = [
  "Vegetariano",
  "Vegano",
  "Sem lactose",
  "Sem glúten",
  "Alergia a amendoim",
  "Alergia a frutos do mar",
];
