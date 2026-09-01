/**
 * Ferramenta de Leitura para o agent de planejamento:
 * consulta a ExerciseDB (AscendAPI, tier V1 OSS) para obter
 * instruções detalhadas, músculos-alvo, músculos secundários e
 * equipamentos de um exercício.
 *
 * O agent usa esses dados para:
 * - Preencher `comoExecutar` (instruções passo a passo traduzidas)
 * - Validar escolha de exercício por equipamento disponível
 * - Enriquecer a justificativa com dados concretos do movimento
 *
 * A curadura manual (src/domain/plano/midia-execucao.ts) não é mais
 * o único caminho: o agent pode buscar diretamente e decidir, e o
 * resultado aprovado vira material do catálogo progressivamente.
 */

import { tool } from "ai";
import { z } from "zod";
import { criarClienteExerciseDB } from "@/infra/exercisedb";

export const consultarExercicio = tool({
  description:
    "Busca informações detalhadas de um ou mais exercícios na ExerciseDB (banco internacional com 11.000+ exercícios). " +
    "Retorna instruções passo a passo (em inglês), músculos-alvo, músculos secundários e equipamentos. " +
    "Use para obter dados precisos de execução ao montar o plano de treino. " +
    "O parâmetro 'termo' aceita nome do exercício em inglês ou português. " +
    "Se o resultado não parecer ideal, tente um termo diferente. " +
    "Exemplos: 'barbell bench press', 'dumbbell squat', 'pull-up', 'push-up'.",
  inputSchema: z.object({
    termo: z
      .string()
      .min(2)
      .describe("Nome do exercício para buscar (aceita português ou inglês)."),
    limite: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(3)
      .describe("Quantos resultados retornar (máx 10)."),
  }),
  execute: async (args) => {
    const { termo, limite } = args;
    const cliente = criarClienteExerciseDB();
    const resultados = await cliente.buscar(termo, limite ?? 3);

    return resultados.map((r) => ({
      exerciseId: r.exerciseId,
      nome: r.nome,
      gifUrl: r.gifUrl,
      musculosAlvo: [...r.musculosAlvo],
      musculosSecundarios: [...r.musculosSecundarios],
      equipamentos: [...r.equipamentos],
      instrucoes: [...r.instrucoes],
    }));
  },
});