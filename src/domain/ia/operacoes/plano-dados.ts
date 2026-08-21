import type { NucleoContexto } from "../contexto/nucleo";

/**
 * Recorte de dados das operações do plano, isolado da chamada ao
 * provedor para que uma inspeção do que é enviado use o mesmo código
 * que envia. Treino e nutrição partem do mesmo recorte: ambos
 * declaram os mesmos campos, incluindo as fotos corporais, que
 * informam tanto proporções quanto estratégia energética.
 */

export interface FotoCorporalPlano {
  id: string;
  pose: string;
  observadoEm: Date | string;
  dados: Uint8Array;
  mediaType: string;
}

export interface EntradaPlano {
  userId: string;
  nucleo: NucleoContexto;
  consentimentos: readonly string[];
  triagemCompleta: unknown;
  fotosCorporais?: readonly FotoCorporalPlano[];
  linhaBaseCorporal?: unknown;
  metasProporcao?: unknown;
  historicoImportado?: unknown;
  origem?: { tela: string; rota: string; gatilho: string };
}

function comoRegistro(valor: unknown): Record<string, unknown> | null {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? valor as Record<string, unknown>
    : null;
}

function selecionar(registro: Record<string, unknown>, campos: readonly string[]) {
  return Object.fromEntries(
    campos
      .filter((campo) => registro[campo] !== undefined && registro[campo] !== null)
      .map((campo) => [campo, registro[campo]]),
  );
}

function mapearLista(valor: unknown, campos: readonly string[]) {
  return Array.isArray(valor)
    ? valor.flatMap((item) => {
        const registro = comoRegistro(item);
        return registro ? [selecionar(registro, campos)] : [];
      })
    : [];
}

/**
 * O núcleo já contém os dados universais da triagem. Este recorte leva apenas
 * respostas adicionais necessárias ao plano, evitando repetir dados do atleta
 * e enviar a data de nascimento quando a idade derivada já está no núcleo.
 */
function resumirTriagemParaPlano(valor: unknown) {
  const triagem = comoRegistro(valor);
  if (!triagem) return valor;

  return selecionar(triagem, [
    "horasSono",
    "nivelAtividade",
    "objetivoComposicao",
    "orcamentoAlimentar",
    "tempoPreparoMin",
  ]);
}

/**
 * Converte registros de persistência no recorte semântico consumido pelo agent.
 * Identificadores internos, chaves de usuário e metadados de gravação nunca
 * atravessam esta fronteira; a Trilha de Decisão recebe o mesmo DTO enxuto.
 */
function resumirLinhaBaseCorporal(valor: unknown) {
  const linhaBase = comoRegistro(valor);
  if (!linhaBase) return valor;

  const pesos = mapearLista(linhaBase.pesos, ["pesoGramas", "observadoEm"]);
  const gorduras = mapearLista(linhaBase.gorduras, [
    "percentualBasisPoints", "metodo", "confianca", "observadoEm",
  ]);
  const avaliacoesVisuais = mapearLista(linhaBase.avaliacoesVisuais, [
    "criterios", "gorduraMinBasisPoints", "gorduraMaxBasisPoints",
    "observacoes", "limitacoes", "confianca", "createdAt",
  ]);

  return {
    medicoes: mapearLista(linhaBase.medicoes, [
      "regiao", "lado", "valorMm", "qualidade", "observadoEm",
    ]),
    pesos: pesos.map(({ pesoGramas, ...peso }) => ({
      ...peso,
      pesoKg: typeof pesoGramas === "number" ? pesoGramas / 1000 : pesoGramas,
    })),
    gorduras: gorduras.map(({ percentualBasisPoints, ...gordura }) => ({
      ...gordura,
      percentual: typeof percentualBasisPoints === "number"
        ? percentualBasisPoints / 100
        : percentualBasisPoints,
    })),
    avaliacoesVisuais: avaliacoesVisuais.map(({ createdAt, ...avaliacao }) => ({
      ...avaliacao,
      observadoEm: createdAt,
    })),
  };
}

function resumirMetasProporcao(valor: unknown) {
  if (!Array.isArray(valor)) return valor;
  return mapearLista(valor, [
    "regiao", "atualMm", "faixaMinMm", "faixaMaxMm", "metaCicloMm",
    "direcao", "confianca", "justificativa",
  ]);
}

export function montarDadosPlano(entrada: {
  triagemCompleta: unknown;
  fotosCorporais?: readonly { id: string; pose: string; observadoEm: Date | string }[];
  linhaBaseCorporal?: unknown;
  metasProporcao?: unknown;
  historicoImportado?: unknown;
}) {
  return {
    "triagem-completa": resumirTriagemParaPlano(entrada.triagemCompleta),
    ...(entrada.fotosCorporais?.length ? {
      "fotos-corporais": entrada.fotosCorporais.map(({ id, pose, observadoEm }) => ({
        id,
        pose,
        observadoEm,
      })),
    } : {}),
    "linha-base-corporal": resumirLinhaBaseCorporal(entrada.linhaBaseCorporal),
    "metas-proporcao": resumirMetasProporcao(entrada.metasProporcao),
    "historico-importado": entrada.historicoImportado,
  };
}
