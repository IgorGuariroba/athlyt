import { z } from "zod";
import { decidir, type ResultadoDecisao } from "../decidir";
import type { NucleoContexto } from "../contexto/nucleo";

/**
 * Copiloto de Sessão — orientação entre séries (CONTEXT.md;
 * specs/mvp-vertical.md, user stories 26–35).
 *
 * Online usa IA; offline o Coach Local aplica regras determinísticas.
 * Este módulo cobre só o caminho online — quando ele degrada, quem
 * chama cai no Coach Local, nunca em simulação de IA (user story 37).
 */

export const orientacaoSchema = z.object({
  cargaSugeridaKg: z
    .number()
    .nullable()
    .describe("Carga para a próxima série; null se não houver base para sugerir"),
  repeticoesAlvo: z.number().int().nullable(),
  rirAlvo: z.number().int().min(0).max(5).nullable(),
  descansoSegundos: z.number().int().nullable(),
  justificativa: z
    .string()
    .describe("Uma frase explicando a sugestão, em linguagem direta"),
  alertaCautela: z
    .string()
    .nullable()
    .describe(
      "Preenchido apenas se houver risco moderado (dor relatada, fadiga alta)",
    ),
});

export type Orientacao = z.infer<typeof orientacaoSchema>;

const INSTRUCAO = `Você é o Copiloto de Sessão do Athlyt, orientando um atleta natural
entre séries de treino.

Regras que não podem ser violadas:
- Não diagnostique condições clínicas nem interprete sintomas como laudo.
- Se houver dor relatada no grupo trabalhado, priorize reduzir carga e
  preencha alertaCautela. Dor aguda não se resolve com ajuste de RIR.
- Não troque o exercício. A estabilidade do Bloco de Treino é o que
  torna a progressão mensurável.
- Pondere cada dado pela proveniência anotada: [medido] vale mais que
  [importado], que vale mais que [estimado]. Dado antigo vale menos.
- Se faltar base para sugerir um número, devolva null nesse campo em
  vez de inventar. Um campo nulo é honesto; um número chutado vira
  carga real na barra.
- Em MODO CONSERVADOR, não proponha progressão agressiva.`;

export interface SerieRegistrada {
  cargaKg: number;
  repeticoes: number;
  rir: number | null;
}

export interface EntradaCopiloto {
  userId: string;
  nucleo: NucleoContexto;
  consentimentos: readonly string[];
  exercicio: {
    nome: string;
    seriesHoje: SerieRegistrada[];
    serieAtual: number;
    totalSeries: number;
  };
  historicoExercicio?: {
    data: string;
    melhorSerie: SerieRegistrada;
  }[];
  prontidaoHoje?: {
    energia: number;
    sono: number;
    fadiga: number;
    dores: string;
    motivacao: number;
  };
  fadigaSemana?: {
    seriesNaSemana: number;
    sessoesNaSemana: number;
  };
}

export async function orientarProximaSerie(
  entrada: EntradaCopiloto,
): Promise<ResultadoDecisao<Orientacao>> {
  return decidir({
    userId: entrada.userId,
    operacao: "copiloto-sessao",
    nucleo: entrada.nucleo,
    consentimentos: entrada.consentimentos,
    dados: {
      exercicio: entrada.exercicio,
      "historico-exercicio": entrada.historicoExercicio,
      "prontidao-hoje": entrada.prontidaoHoje,
      "fadiga-semana": entrada.fadigaSemana,
    },
    instrucao: INSTRUCAO,
    schema: orientacaoSchema,
  });
}
