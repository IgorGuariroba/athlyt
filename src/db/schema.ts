import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  uuid,
  jsonb,
  boolean,
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
 * Autorização — separada da autenticação (ver specs/mvp-vertical.md,
 * "Implementation Decisions"): só e-mails na allowlist podem
 * criar/acessar perfil, mesmo autenticados com sucesso pelo Google.
 */
export const allowedEmails = pgTable("allowed_email", {
  email: text("email").primaryKey(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Perfil e Triagem — versionado (specs/mvp-vertical.md, user story
 * 17): cada alteração grava uma linha nova em vez de sobrescrever a
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

/**
 * Trilha de Decisão (specs/mvp-vertical.md, user stories 91–92, 116;
 * ADR 0006). Registra, por decisão de IA, o Recorte de Contexto
 * efetivamente enviado, as Ferramentas de Leitura consultadas e o
 * modelo resolvido pelo provedor — não o nome lógico solicitado.
 *
 * `auditavel = false` marca respostas em que o provedor não
 * identificou o modelo resolvido; a ADR 0005 exige tratá-las como
 * não auditáveis.
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
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Consentimento por operação (user stories 105–107). Vinculado ao id
 * de campo declarado no Recorte de Contexto, não a categorias soltas
 * — é o que permite derivar o texto exibido da própria declaração.
 *
 * `revogadoEm` preserva o histórico: revogar afeta usos futuros sem
 * apagar decisões passadas necessárias à auditoria (user story 107).
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
  tipo: text("tipo").$type<"sessao_iniciada" | "serie_registrada" | "sessao_concluida" | "sessao_abandonada" | "exercicio_substituido">().notNull(),
  dados: jsonb("dados").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Substituições de exercício com motivo (user story 23; tela 035).
 *
 * A linha é o registro durável do motivo, e não apenas do par
 * trocado: é ele que decide se a troca vale só para a sessão em que
 * aconteceu (preferência) ou se persiste nas próximas sessões do
 * bloco (equipamento indisponível, dor). Sem esse registro, um
 * exercício-chave mudaria de sessão para sessão sem rastro, que é
 * exatamente o que a user story proíbe.
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
});
