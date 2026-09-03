import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  uuid,
  jsonb,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

/**
 * Tabelas exigidas pelo @auth/drizzle-adapter (Auth.js v5).
 * Mantidas no shape padrão do adapter para compatibilidade automática.
 * https://authjs.dev/getting-started/adapters/drizzle
 */
export const users = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);

/**
 * Autorização — separada da autenticação: só e-mails na allowlist
 * podem criar ou acessar perfil, mesmo autenticados com sucesso pelo
 * Google.
 */
export const allowedEmails = pgTable("allowed_email", {
  email: text("email").primaryKey(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Perfil e Triagem — versionado: cada alteração grava uma linha nova
 * em vez de sobrescrever a
 * anterior. `respostas` acumula o merge de todas as respostas dadas
 * até aquela versão (snapshot completo, não um diff), o que mantém a
 * leitura da versão vigente em uma única query.
 */
export const profileVersions = pgTable("profile_version", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  respostas: jsonb("respostas").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const bodyAssessments = pgTable("body_assessment", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tipo: text("tipo").$type<"inicial" | "acompanhamento">().notNull(),
  estado: text("estado").$type<"em_andamento" | "concluida">().notNull().default("em_andamento"),
  observadoEm: timestamp("observado_em", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("body_assessment_user_date_idx").on(t.userId, t.observadoEm)]);

export const weightMeasurements = pgTable("weight_measurement", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pesoGramas: integer("peso_gramas").notNull(),
  observadoEm: timestamp("observado_em", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("weight_measurement_user_date_idx").on(t.userId, t.observadoEm)]);

export const weightGoals = pgTable("weight_goal", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pesoGramas: integer("peso_gramas").notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("weight_goal_user_date_idx").on(t.userId, t.createdAt)]);

export const bodyMeasurements = pgTable("body_measurement", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id").references(() => bodyAssessments.id, { onDelete: "set null" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  regiao: text("regiao").notNull(),
  lado: text("lado").$type<"unico" | "direito" | "esquerdo">().notNull().default("unico"),
  leiturasMm: jsonb("leituras_mm").$type<number[]>().notNull(),
  valorMm: integer("valor_mm").notNull(),
  protocoloVersao: text("protocolo_versao").notNull(),
  qualidade: text("qualidade").$type<"alta" | "moderada" | "baixa">().notNull(),
  condicoes: text("condicoes"),
  observadoEm: timestamp("observado_em", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("body_measurement_user_region_date_idx").on(t.userId, t.regiao, t.observadoEm)]);

export const bodyFatMeasurements = pgTable("body_fat_measurement", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id").references(() => bodyAssessments.id, { onDelete: "set null" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  percentualBasisPoints: integer("percentual_basis_points").notNull(),
  metodo: text("metodo").notNull(),
  protocolo: text("protocolo"),
  equipamento: text("equipamento"),
  profissional: text("profissional"),
  confianca: text("confianca").$type<"alta" | "moderada" | "baixa">().notNull(),
  observadoEm: timestamp("observado_em", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("body_fat_user_method_date_idx").on(t.userId, t.metodo, t.observadoEm)]);

export const progressPhotos = pgTable("progress_photo", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id").references(() => bodyAssessments.id, { onDelete: "set null" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pose: text("pose").$type<"frente" | "costas" | "lateral_direita" | "lateral_esquerda">().notNull(),
  objectKey: text("object_key").notNull(),
  condicoes: text("condicoes"),
  protocoloVersao: text("protocolo_versao").notNull().default("foto-v1"),
  excluirEm: timestamp("excluir_em", { mode: "date", withTimezone: true }),
  observadoEm: timestamp("observado_em", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("progress_photo_user_date_idx").on(t.userId, t.observadoEm)]);

export const bodyProportionGoals = pgTable("body_proportion_goal", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  regiao: text("regiao").notNull(),
  atualMm: integer("atual_mm").notNull(),
  faixaMinMm: integer("faixa_min_mm").notNull(),
  faixaMaxMm: integer("faixa_max_mm").notNull(),
  metaCicloMm: integer("meta_ciclo_mm").notNull(),
  direcao: text("direcao").$type<"aumentar" | "reduzir" | "manter">().notNull(),
  confianca: text("confianca").$type<"alta" | "moderada" | "baixa">().notNull(),
  justificativa: text("justificativa").notNull(),
  metodologiaVersao: text("metodologia_versao").notNull(),
  ativa: boolean("ativa").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("body_goal_user_active_idx").on(t.userId, t.ativa)]);

export const bodyVisualAnalyses = pgTable("body_visual_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  photoIds: jsonb("photo_ids").$type<string[]>().notNull(),
  criterios: jsonb("criterios").$type<{ vTaper: number; ombros: number; cintura: number; equilibrio: number; simetria: number }>().notNull(),
  gorduraMinBasisPoints: integer("gordura_min_basis_points").notNull(),
  gorduraMaxBasisPoints: integer("gordura_max_basis_points").notNull(),
  observacoes: jsonb("observacoes").$type<string[]>().notNull(),
  limitacoes: jsonb("limitacoes").$type<string[]>().notNull(),
  confianca: text("confianca").$type<"alta" | "moderada" | "baixa">().notNull(),
  metodologiaVersao: text("metodologia_versao").notNull(),
  modeloResolvido: text("modelo_resolvido").notNull(),
  ativa: boolean("ativa").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("body_visual_user_date_idx").on(t.userId, t.createdAt)]);

export const weeklyBodyReviews = pgTable("weekly_body_review", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodoInicio: timestamp("periodo_inicio", { mode: "date", withTimezone: true }).notNull(),
  periodoFim: timestamp("periodo_fim", { mode: "date", withTimezone: true }).notNull(),
  scorecard: jsonb("scorecard").notNull(),
  confiancas: jsonb("confiancas").notNull(),
  evidencias: jsonb("evidencias").notNull(),
  proposta: jsonb("proposta").notNull(),
  estado: text("estado").$type<"pendente" | "aplicada" | "rejeitada" | "desfeita">().notNull().default("pendente"),
  baselinePlanId: uuid("baseline_plan_id"),
  appliedPlanId: uuid("applied_plan_id"),
  rollbackPlanId: uuid("rollback_plan_id"),
  metodologiaVersao: text("metodologia_versao").notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("weekly_body_review_user_date_idx").on(t.userId, t.periodoFim)]);

/**
 * Trilha de Decisão. Registra, por decisão de IA, o Recorte de
 * Contexto efetivamente enviado, as Ferramentas de Leitura consultadas
 * e o modelo resolvido pelo provedor — não o nome lógico solicitado.
 *
 * `auditavel = false` marca respostas em que o provedor não identificou
 * o modelo resolvido: sem o modelo efetivo, a resposta não pode ser
 * reproduzida nem auditada.
 */
export const decisionTrails = pgTable("decision_trail", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  operacao: text("operacao").notNull(),
  recorteVersao: integer("recorte_versao").notNull(),
  perfilVersao: integer("perfil_versao").notNull(),
  modeloSolicitado: text("modelo_solicitado").notNull(),
  modeloResolvido: text("modelo_resolvido"),
  auditavel: boolean("auditavel").notNull(),
  degradado: boolean("degradado").notNull(),
  camposEnviados: jsonb("campos_enviados").notNull(),
  camposOmitidos: jsonb("campos_omitidos").notNull(),
  ferramentasConsultadas: jsonb("ferramentas_consultadas").notNull(),
  resultado: jsonb("resultado"),
  erro: text("erro"),
  origemTela: text("origem_tela"),
  origemRota: text("origem_rota"),
  gatilho: text("gatilho"),
  contextoEnviado: jsonb("contexto_enviado"),
  instrucaoSistema: text("instrucao_sistema"),
  promptEnviado: text("prompt_enviado"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Consentimento por operação. Vinculado ao id
 * de campo declarado no Recorte de Contexto, não a categorias soltas
 * — é o que permite derivar o texto exibido da própria declaração.
 *
 * `revogadoEm` preserva o histórico: revogar afeta usos futuros sem
 * apagar decisões passadas necessárias à auditoria.
 */
/**
 * Planos — rascunhos podem receber substituições durante a revisão;
 * ativar materializa uma nova versão imutável. `conteudo` é o snapshot
 * completo produzido pelo Motor Adaptativo, de modo que uma versão
 * continue reproduzível mesmo depois de catálogo e regras evoluírem.
 */
export const plans = pgTable("plan", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  perfilVersao: integer("perfil_versao").notNull(),
  versao: integer("versao"),
  estado: text("estado").$type<"rascunho" | "ativo" | "arquivado">().notNull(),
  regraVersao: text("regra_versao").notNull(),
  modoConservador: boolean("modo_conservador").notNull(),
  conteudo: jsonb("conteudo").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  activatedAt: timestamp("activated_at", { mode: "date" }),
});

/**
 * Sessão de Treino — o snapshot planejado congela o dia do Plano Ativo no
 * momento do início; eventos append-only preservam a execução factual e já
 * formam a base do futuro outbox offline.
 */
export const planExperiments = pgTable("plan_experiment", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  baselinePlanId: uuid("baseline_plan_id").notNull().references(() => plans.id),
  experimentPlanId: uuid("experiment_plan_id").notNull().references(() => plans.id),
  rollbackPlanId: uuid("rollback_plan_id").references(() => plans.id),
  hipotese: text("hipotese").notNull(),
  variaveis: jsonb("variaveis").$type<string[]>().notNull(),
  criterioSucesso: text("criterio_sucesso").notNull(),
  criterioInterrupcao: text("criterio_interrupcao").notNull(),
  janelaMinimaSemanas: integer("janela_minima_semanas").notNull(),
  estado: text("estado").$type<"ativo" | "sucesso" | "interrompido" | "revertido">().notNull().default("ativo"),
  startedAt: timestamp("started_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { mode: "date", withTimezone: true }),
}, (t) => [index("plan_experiment_user_state_idx").on(t.userId, t.estado)]);

/**
 * Solicitação de reavaliação aberta por uma mudança relevante no Contexto do
 * Atleta. Ela não modifica o Plano Ativo: preserva o baseline até que a
 * Revisão Semanal produza e o atleta aprove um Experimento de Plano.
 */
export const planReassessments = pgTable("plan_reassessment", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  gatilho: text("gatilho").$type<"mudanca_objetivo">().notNull(),
  estado: text("estado").$type<"pendente" | "incorporada" | "aplicada" | "rejeitada" | "cancelada">().notNull().default("pendente"),
  impacto: text("impacto").$type<"estrutural">().notNull(),
  baselinePlanId: uuid("baseline_plan_id").notNull().references(() => plans.id),
  perfilVersaoAnterior: integer("perfil_versao_anterior").notNull(),
  perfilVersaoNova: integer("perfil_versao_nova").notNull(),
  objetivoAnterior: text("objetivo_anterior").notNull(),
  objetivoNovo: text("objetivo_novo").notNull(),
  reviewId: uuid("review_id").references(() => weeklyBodyReviews.id, { onDelete: "set null" }),
  candidatePlanId: uuid("candidate_plan_id").references(() => plans.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { mode: "date", withTimezone: true }),
}, (t) => [index("plan_reassessment_user_state_idx").on(t.userId, t.estado)]);

export const workoutSessions = pgTable("workout_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").notNull().references(() => plans.id),
  diaId: text("dia_id").notNull(),
  nome: text("nome").notNull(),
  estado: text("estado").$type<"em_andamento" | "concluida" | "abandonada">().notNull(),
  exercicios: jsonb("exercicios").notNull(),
  startedAt: timestamp("started_at", { mode: "date" }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { mode: "date" }),
  motivoAbandono: text("motivo_abandono"),
});

export const workoutEvents = pgTable("workout_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tipo: text("tipo").$type<"sessao_iniciada" | "serie_registrada" | "sessao_concluida" | "sessao_abandonada" | "exercicio_substituido" | "alerta_cautela_ignorado">().notNull(),
  dados: jsonb("dados").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  /**
   * Identificador estável gerado no dispositivo. É a chave
   * de idempotência do outbox: o índice único abaixo é o que faz o
   * reenvio da fila ser inofensivo mesmo sob corrida entre duas abas
   * ou entre a fila e uma escrita online. Nulo para eventos nascidos
   * no servidor.
   */
  clientEventId: uuid("client_event_id"),
  /** Timestamp do dispositivo; pode divergir de `createdAt`. */
  ocorridoEm: timestamp("ocorrido_em", { mode: "date" }),
  /** Ordem lógica monotônica por sessão, atribuída no dispositivo. */
  ordem: integer("ordem"),
}, (tabela) => [
  uniqueIndex("workout_event_client_event_id_idx").on(tabela.clientEventId),
]);

/**
 * Conflitos de sincronização que exigem decisão humana.
 *
 * Só chega aqui o que o merge não consegue resolver com segurança —
 * uma série já gravada com valores diferentes, um encerramento sobre
 * sessão já encerrada. Guardar as duas versões lado a lado é o que
 * impede a perda silenciosa que a spec proíbe: nada é descartado até
 * o atleta escolher.
 */
export const syncConflicts = pgTable("sync_conflict", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
  clientEventId: uuid("client_event_id").notNull(),
  motivo: text("motivo").$type<"serie_divergente" | "sessao_ja_encerrada">().notNull(),
  servidor: jsonb("servidor").notNull(),
  dispositivo: jsonb("dispositivo").notNull(),
  resolucao: text("resolucao").$type<"servidor" | "dispositivo">(),
  resolvidoEm: timestamp("resolvido_em", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (tabela) => [
  uniqueIndex("sync_conflict_client_event_id_idx").on(tabela.clientEventId),
]);

/**
 * Substituições de exercício com motivo.
 *
 * A linha é o registro durável do motivo, e não apenas do par
 * trocado: é ele que decide se a troca vale só para a sessão em que
 * aconteceu (preferência) ou se persiste nas próximas sessões do
 * bloco (equipamento indisponível, dor). Sem esse registro, um
 * exercício-chave mudaria de sessão para sessão sem rastro.
 */
export const exerciseSubstitutions = pgTable("exercise_substitution", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").references(() => workoutSessions.id, { onDelete: "set null" }),
  diaId: text("dia_id").notNull(),
  exercicioOriginalId: text("exercicio_original_id").notNull(),
  exercicioNovoId: text("exercicio_novo_id").notNull(),
  motivo: text("motivo").$type<"equipamento" | "dor" | "preferencia">().notNull(),
  observacao: text("observacao"),
  /** Falso para trocas pontuais; verdadeiro enquanto valer adiante. */
  persistente: boolean("persistente").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Consumo Confirmado.
 *
 * Entidade distinta da prescrição: a Entrada Planejada continua sendo
 * derivada do Plano Ativo e nunca é gravada aqui. Só o que o atleta
 * confirmou vira linha — é isso que impede um cardápio prescrito de
 * se passar por consumo real.
 *
 * `consumidoEm` é UTC; o "dia" alimentar é derivado do fuso do atleta
 * na leitura (src/domain/diario/dia-alimentar.ts), e não gravado como
 * rótulo, para continuar correto se o fuso mudar.
 *
 * O índice único por (usuário, dia, refeição) é o que torna confirmar
 * duas vezes inofensivo — inclusive sob duplo toque ou reenvio de
 * fila offline. Entradas avulsas têm `refeicaoRef` nulo e não
 * participam da restrição.
 */
export const foodEntries = pgTable("food_entry", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").references(() => plans.id),
  /** Referência à refeição do Cardápio Diário; nulo quando avulso. */
  refeicaoRef: text("refeicao_ref"),
  diaAlimentar: text("dia_alimentar").notNull(),
  nome: text("nome").notNull(),
  origem: text("origem").$type<"planejado" | "editado" | "avulso">().notNull(),
  itens: jsonb("itens").notNull(),
  macros: jsonb("macros").notNull(),
  /** Snapshot da prescrição no momento da confirmação; nulo se avulso. */
  planejado: jsonb("planejado"),
  consumidoEm: timestamp("consumido_em", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
}, (tabela) => [
  uniqueIndex("food_entry_refeicao_do_dia_idx").on(tabela.userId, tabela.diaAlimentar, tabela.refeicaoRef),
]);

/**
 * Alimentos criados pelo atleta na entrada manual e
 * favoritos marcados a partir da base.
 *
 * Uma única tabela porque a pergunta que o Diário faz é sempre a
 * mesma — "o que este atleta reusa?" — e separar em duas obrigaria a
 * união em toda leitura. `alimentoId` nulo identifica alimento
 * próprio; preenchido, é um favorito da base.
 *
 * Recorrentes não vivem aqui: eles são derivados de `food_entry`, e
 * duplicar esse dado criaria duas verdades sobre a mesma história.
 */
export const foodLibrary = pgTable("food_library", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** Id do catálogo quando favoritado; nulo quando alimento próprio. */
  alimentoId: text("alimento_id"),
  nome: text("nome").notNull(),
  favorito: boolean("favorito").notNull().default(false),
  /** Macros por 100 g para alimento próprio; nulo para favorito da base. */
  por100g: jsonb("por_100g"),
  porcoes: jsonb("porcoes"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
}, (tabela) => [
  uniqueIndex("food_library_alimento_idx").on(tabela.userId, tabela.alimentoId),
]);

export const consents = pgTable("consent", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  operacao: text("operacao").notNull(),
  campo: text("campo").notNull(),
  recorteVersao: integer("recorte_versao").notNull(),
  provedor: text("provedor").notNull(),
  concedidoEm: timestamp("concedido_em", { mode: "date" })
    .notNull()
    .defaultNow(),
  revogadoEm: timestamp("revogado_em", { mode: "date" }),
}, (tabela) => [
  uniqueIndex("consent_active_unique_idx")
    .on(tabela.userId, tabela.operacao, tabela.campo, tabela.recorteVersao)
    .where(sql`${tabela.revogadoEm} IS NULL`),
]);
