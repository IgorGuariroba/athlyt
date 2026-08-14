import { z } from "zod";
import { EXERCICIOS } from "@/domain/plano/exercicios";
import type { PlanoGerado } from "@/domain/plano/tipos";
import { decidir, type ResultadoDecisao } from "../decidir";
import type { NucleoContexto } from "../contexto/nucleo";

const exercicioSchema = z.object({
  exercicioId: z.string(),
  nome: z.string(),
  padrao: z.enum(["empurrar-horizontal", "empurrar-vertical", "puxar-horizontal", "puxar-vertical", "agachar", "dobradica", "extensao-joelho", "flexao-joelho", "elevacao-lateral", "flexao-cotovelo", "extensao-cotovelo", "panturrilha", "core"]),
  series: z.number().int().min(1).max(8),
  repeticoes: z.string(),
  rir: z.number().int().min(0).max(5),
  descansoSeg: z.number().int().min(30).max(300),
  justificativa: z.string(),
}).superRefine((exercicio, contexto) => {
  const catalogado = EXERCICIOS.find((item) => item.id === exercicio.exercicioId);
  if (!catalogado) {
    contexto.addIssue({ code: "custom", path: ["exercicioId"], message: "Exercício fora do catálogo Athlyt" });
  } else if (catalogado.padrao !== exercicio.padrao) {
    contexto.addIssue({ code: "custom", path: ["padrao"], message: "Padrão divergente do catálogo Athlyt" });
  }
});

export const planoInicialSchema = z.object({
  regraVersao: z.literal("agent-plano-v1"),
  modoConservador: z.boolean(),
  prioridadesCorporais: z.array(z.string()),
  perfilVersao: z.number().int().positive(),
  bloco: z.object({
    duracaoSemanas: z.number().int().min(4).max(8),
    divisao: z.string(),
    dias: z.array(z.object({
      id: z.string(),
      nome: z.string(),
      diaSemana: z.string(),
      exercicios: z.array(exercicioSchema),
    })).min(1).max(7),
  }),
  nutricao: z.object({
    calorias: z.number().int().positive(),
    proteinaG: z.number().int().nonnegative(),
    carboidratosG: z.number().int().nonnegative(),
    gordurasG: z.number().int().nonnegative(),
    fibrasG: z.number().int().nonnegative(),
    estrategia: z.string(),
    refeicoes: z.array(z.object({
      nome: z.string(),
      percentual: z.number().min(0).max(100),
      calorias: z.number().int().nonnegative(),
      proteinaG: z.number().int().nonnegative(),
      itens: z.array(z.string()),
    })),
  }),
  dadosUsados: z.array(z.string()),
});

const catalogo = EXERCICIOS.map(({ id, nome, padrao, requer, evitarSeLesaoEm, exigeTecnicaAvancada }) => ({ id, nome, padrao, requer, evitarSeLesaoEm, exigeTecnicaAvancada }));

const INSTRUCAO = `Você é o agent de planejamento do Athlyt. Gere um Plano Ativo altamente personalizado para um atleta natural, combinando Bloco de Treino e estratégia nutricional.

Regras obrigatórias:
- Use todas as informações fornecidas e explique escolhas específicas nas justificativas.
- Saúde, lesões, restrições alimentares, equipamentos, disponibilidade, experiência, orçamento, preparo, sono e objetivo são limites reais; nunca os ignore.
- Não diagnostique, não prescreva medicamentos e não prometa resultados.
- Em MODO CONSERVADOR, evite estratégia energética agressiva, exercícios avançados e volume elevado.
- Prescreva somente exercicioId e padrao existentes no catálogo abaixo, respeitando equipamento e contraindicações.
- O perfilVersao deve ser exatamente o recebido no contexto.
- regraVersao deve ser "agent-plano-v1".
- dadosUsados deve listar os ids dos campos do contexto que fundamentaram o plano.
- Refeições devem trazer alimentos e quantidades em texto, respeitando restrições, orçamento e tempo de preparo.

Catálogo permitido:
${JSON.stringify(catalogo)}`;

export interface EntradaPlanoInicial {
  userId: string;
  nucleo: NucleoContexto;
  consentimentos: readonly string[];
  triagemCompleta: unknown;
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
 * Converte registros de persistência no recorte semântico consumido pelo agent.
 * Identificadores internos, chaves de usuário e metadados de gravação nunca
 * atravessam esta fronteira; a Trilha de Decisão recebe o mesmo DTO enxuto.
 */
function resumirLinhaBaseCorporal(valor: unknown) {
  const linhaBase = comoRegistro(valor);
  if (!linhaBase) return valor;

  const fotos = mapearLista(linhaBase.fotosDisponiveis, ["observadoEm"]);
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
    fotos: {
      quantidade: fotos.length,
      observadasEm: fotos.flatMap((foto) => foto.observadoEm ? [foto.observadoEm] : []),
    },
  };
}

function resumirMetasProporcao(valor: unknown) {
  if (!Array.isArray(valor)) return valor;
  return mapearLista(valor, [
    "regiao", "atualMm", "faixaMinMm", "faixaMaxMm", "metaCicloMm",
    "direcao", "confianca", "justificativa",
  ]);
}

export function gerarPlanoInicialComIA(entrada: EntradaPlanoInicial): Promise<ResultadoDecisao<PlanoGerado>> {
  return decidir({
    userId: entrada.userId,
    operacao: "plano-inicial",
    nucleo: entrada.nucleo,
    consentimentos: entrada.consentimentos,
    dados: {
      "triagem-completa": entrada.triagemCompleta,
      "linha-base-corporal": resumirLinhaBaseCorporal(entrada.linhaBaseCorporal),
      "metas-proporcao": resumirMetasProporcao(entrada.metasProporcao),
      "historico-importado": entrada.historicoImportado,
    },
    instrucao: INSTRUCAO,
    schema: planoInicialSchema,
    origem: entrada.origem,
  });
}
