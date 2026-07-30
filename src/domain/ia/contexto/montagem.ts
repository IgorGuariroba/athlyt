import type { NucleoContexto } from "./nucleo";
import { obterRecorte } from "./recortes";
import type {
  OperacaoIA,
  Proveniencia,
  RecorteDeclarado,
  ValorContexto,
} from "./tipos";

/**
 * Montagem do Contexto do Atleta para uma operação (ADR 0006).
 *
 * O resultado é ao mesmo tempo o que vai ao modelo e o que vai à
 * Trilha de Decisão — são a mesma estrutura por construção, para que
 * não possam divergir.
 */

/** Dados do Recorte, por id de campo declarado. */
export type DadosRecorte = Record<string, unknown>;

export interface ContextoDoAtleta {
  operacao: OperacaoIA;
  recorteVersao: number;
  nucleo: NucleoContexto;
  recorte: DadosRecorte;
  /** Campos declarados que foram omitidos por falta de consentimento. */
  camposOmitidos: string[];
  /** Verdadeiro quando algum campo sensível foi omitido. */
  degradado: boolean;
}

export interface EntradaMontagem {
  operacao: OperacaoIA;
  nucleo: NucleoContexto;
  dados: DadosRecorte;
  /** Ids de campo com consentimento vigente para esta operação. */
  consentimentos: readonly string[];
}

/**
 * Monta o contexto aplicando a declaração do Recorte como filtro.
 *
 * Duas regras da ADR 0006 ficam mecânicas aqui:
 *
 * - Campo não declarado é descartado mesmo se vier em `dados` — a
 *   declaração limita o envio, não a intenção de quem chama.
 * - Campo sensível sem consentimento é omitido e registrado em
 *   `camposOmitidos`, nunca substituído por aproximação silenciosa
 *   (invariante 5). O chamador degrada declarando ao usuário que
 *   decidiu com menos informação.
 */
export function montarContexto(entrada: EntradaMontagem): ContextoDoAtleta {
  const recorte = obterRecorte(entrada.operacao);
  const consentidos = new Set(entrada.consentimentos);

  const dadosFiltrados: DadosRecorte = {};
  const camposOmitidos: string[] = [];

  for (const campo of recorte.campos) {
    const valor = entrada.dados[campo.id];
    if (valor === undefined) continue;

    if (campo.sensivel && !consentidos.has(campo.id)) {
      camposOmitidos.push(campo.id);
      continue;
    }

    dadosFiltrados[campo.id] = valor;
  }

  return {
    operacao: entrada.operacao,
    recorteVersao: recorte.versao,
    nucleo: entrada.nucleo,
    recorte: dadosFiltrados,
    camposOmitidos,
    degradado: camposOmitidos.length > 0,
  };
}

function ehValorContexto(valor: unknown): valor is ValorContexto<unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "valor" in valor &&
    "proveniencia" in valor
  );
}

function rotuloProveniencia(
  proveniencia: Proveniencia,
  observadoEm?: Date,
): string {
  const data = observadoEm ? `, ${observadoEm.toISOString().slice(0, 10)}` : "";
  return `[${proveniencia}${data}]`;
}

/**
 * Serializa um valor anotado mantendo proveniência e recência
 * visíveis ao modelo — sem isso ele pondera dado `estimado` antigo
 * como se fosse medição de hoje (ADR 0006, invariante 1).
 */
function serializarValor(valor: unknown): string {
  if (ehValorContexto(valor)) {
    const conteudo = serializarValor(valor.valor);
    return `${conteudo} ${rotuloProveniencia(valor.proveniencia, valor.observadoEm)}`;
  }
  if (Array.isArray(valor)) {
    return valor.length === 0 ? "nenhum" : valor.map(serializarValor).join(", ");
  }
  if (valor instanceof Date) return valor.toISOString();
  if (valor === "") return "nenhum";
  if (typeof valor === "object" && valor !== null) {
    return JSON.stringify(valor);
  }
  return String(valor);
}

/**
 * Renderiza o contexto como texto para o prompt. Campos ausentes são
 * omitidos em vez de aparecerem como vazios: "não perguntado" e
 * "respondeu nada" são estados diferentes, e a triagem já distingue
 * os dois.
 */
export function renderizarContexto(contexto: ContextoDoAtleta): string {
  const linhas: string[] = [];

  linhas.push("## Perfil do atleta");
  if (contexto.nucleo.modoConservador) {
    linhas.push(
      "MODO CONSERVADOR ATIVO: faltam dados obrigatórios do perfil. " +
        "Não aplique estratégia energética agressiva nem progressão avançada.",
    );
  }

  for (const [chave, valor] of Object.entries(contexto.nucleo)) {
    if (chave === "modoConservador" || chave === "perfilVersao") continue;
    if (valor === undefined) continue;
    linhas.push(`- ${chave}: ${serializarValor(valor)}`);
  }

  const entradasRecorte = Object.entries(contexto.recorte);
  if (entradasRecorte.length > 0) {
    linhas.push("", "## Dados da operação");
    for (const [chave, valor] of entradasRecorte) {
      linhas.push(`- ${chave}: ${serializarValor(valor)}`);
    }
  }

  if (contexto.degradado) {
    linhas.push(
      "",
      "## Informação indisponível",
      "Os dados a seguir não foram enviados por falta de consentimento: " +
        `${contexto.camposOmitidos.join(", ")}. ` +
        "Decida com o que há e sinalize a limitação — não presuma valores.",
    );
  }

  return linhas.join("\n");
}

/**
 * Texto de consentimento derivado da declaração do Recorte, não
 * escrito à mão (ADR 0006, invariante 3): dado, finalidade e
 * provedor, como exige a user story 106.
 */
export function textoConsentimento(
  recorte: RecorteDeclarado,
  provedor: string,
): string {
  const sensiveis = recorte.campos.filter((c) => c.sensivel);
  const itens = sensiveis.map((c) => `- ${c.descricao}`).join("\n");
  return [
    `Finalidade: ${recorte.finalidade}.`,
    `Provedor: ${provedor}.`,
    sensiveis.length > 0
      ? `Dados enviados:\n${itens}`
      : "Nenhum dado sensível é enviado nesta operação.",
  ].join("\n");
}
