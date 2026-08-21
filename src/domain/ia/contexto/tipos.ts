/**
 * Contexto do Atleta — tipos base (ADR 0006).
 *
 * O Contexto do Atleta é a projeção versionada do estado do usuário
 * enviada ao modelo em cada decisão. Não é dump do banco nem
 * subconjunto "seguro": inclui dado sensível quando ele for
 * pertinente à operação. O corte é por relevância, nunca por pudor.
 */

/**
 * Origem de um valor, usada pelo modelo para ponderar confiança e
 * pelo Modo Conservador para decidir agressividade (ADR 0006,
 * invariante 1). `medido` vem de registro direto do usuário;
 * `importado` veio da Importação de Histórico; `estimado` foi
 * derivado pelo sistema ou por IA e ainda não confirmado.
 */
export type Proveniencia = "medido" | "importado" | "estimado";

/**
 * Valor anotado. Todo dado que entra no contexto carrega origem e
 * recência — sem isso o modelo trata chute de importação como
 * medição real.
 */
export interface ValorContexto<T> {
  valor: T;
  proveniencia: Proveniencia;
  /** Quando o valor passou a valer. Ausente = sem data conhecida. */
  observadoEm?: Date;
}

export function medido<T>(valor: T, observadoEm?: Date): ValorContexto<T> {
  return { valor, proveniencia: "medido", observadoEm };
}

export function importado<T>(valor: T, observadoEm?: Date): ValorContexto<T> {
  return { valor, proveniencia: "importado", observadoEm };
}

export function estimado<T>(valor: T, observadoEm?: Date): ValorContexto<T> {
  return { valor, proveniencia: "estimado", observadoEm };
}

/** Operações de IA do produto. Cada uma tem um Recorte próprio. */
export type OperacaoIA =
  | "copiloto-sessao"
  | "revisao-semanal"
  | "plano-treino"
  | "plano-nutricao"
  | "refeicao-texto"
  | "refeicao-foto"
  | "avaliacao-visual"
  | "importacao-historico";

/**
 * Campo declarado por um Recorte. `sensivel` marca os campos que
 * exigem consentimento vigente para a operação; a lista de campos é
 * a fonte de verdade do texto de consentimento e do registro na
 * Trilha de Decisão (ADR 0006, invariante 3).
 */
export interface CampoDeclarado {
  id: string;
  descricao: string;
  sensivel: boolean;
}

/**
 * Um Recorte de Contexto é versionado: mudar o que uma operação
 * envia é mudança de versão, reproduzível a partir da Trilha de
 * Decisão (ADR 0006, invariante 4).
 */
export interface RecorteDeclarado {
  operacao: OperacaoIA;
  versao: number;
  /** Finalidade em linguagem de usuário, base do consentimento. */
  finalidade: string;
  campos: readonly CampoDeclarado[];
}

export function camposSensiveis(
  recorte: RecorteDeclarado,
): readonly CampoDeclarado[] {
  return recorte.campos.filter((campo) => campo.sensivel);
}
