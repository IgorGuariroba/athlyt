import { z } from "zod";
import { EXERCICIOS } from "@/domain/plano/exercicios";
import type { BlocoTreino } from "@/domain/plano/tipos";
import { decidir, type ResultadoDecisao } from "../decidir";
import { ANCORAS, explicacaoAncoradaEm, regrasDeExplicacao } from "./plano-explicacao";
import { montarDadosPlano, type EntradaPlano } from "./plano-dados";

const exercicioSchema = z.object({
  exercicioId: z.string(),
  nome: z.string(),
  padrao: z.enum(["empurrar-horizontal", "empurrar-vertical", "puxar-horizontal", "puxar-vertical", "agachar", "dobradica", "extensao-joelho", "flexao-joelho", "elevacao-lateral", "flexao-cotovelo", "extensao-cotovelo", "panturrilha", "core", "cardio"]),
  series: z.number().int().min(1).max(8),
  repeticoes: z.string(),
  rir: z.number().int().min(0).max(5),
  descansoSeg: z.number().int().min(30).max(300),
  explicacao: explicacaoAncoradaEm(ANCORAS.exercicio),
}).superRefine((exercicio, contexto) => {
  const catalogado = EXERCICIOS.find((item) => item.id === exercicio.exercicioId);
  if (!catalogado) {
    contexto.addIssue({ code: "custom", path: ["exercicioId"], message: "Exercício fora do catálogo Athlyt" });
  } else if (catalogado.padrao !== exercicio.padrao) {
    contexto.addIssue({ code: "custom", path: ["padrao"], message: "Padrão divergente do catálogo Athlyt" });
  }
});

export const planoTreinoSchema = z.object({
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
      explicacao: explicacaoAncoradaEm(ANCORAS.dia),
    })).min(1).max(7),
    explicacao: explicacaoAncoradaEm(ANCORAS.bloco),
  }),
  dadosUsados: z.array(z.string()),
});

export type PlanoTreinoGerado = z.infer<typeof planoTreinoSchema>;

/**
 * Catálogo em linhas, não em JSON.
 *
 * O agent precisa de id, padrão, equipamento e contraindicação para
 * escolher; as chaves repetidas do JSON custavam mais que o conteúdo.
 * `comoExecutar` não entra: o texto já vive no catálogo estático e a
 * tela o usa direto (`DefinicaoExercicio.comoExecutar`), então mandá-lo
 * ao modelo só para recebê-lo de volta idêntico era desperdício nas
 * duas pontas.
 */
function linhaCatalogo(exercicio: (typeof EXERCICIOS)[number]): string {
  const equipamento = exercicio.requer.length === 0
    ? "peso-do-corpo"
    : exercicio.requer.map((conjunto) => conjunto.join("+")).join(" ou ");
  const partes = [exercicio.id, exercicio.padrao, equipamento];
  if (exercicio.evitarSeLesaoEm.length > 0) {
    partes.push(`evitar-se-lesao:${exercicio.evitarSeLesaoEm.join(",")}`);
  }
  if (exercicio.exigeTecnicaAvancada) partes.push("tecnica-avancada");
  return partes.join(" | ");
}

const CATALOGO = EXERCICIOS.map(linhaCatalogo).join("\n");

const INSTRUCAO = `Você é o agent de planejamento de treino do Athlyt. Gere o Bloco de Treino inicial de um atleta natural.

Regras obrigatórias:
- Use todas as informações fornecidas e explique escolhas específicas.
${regrasDeExplicacao({ exercicio: ANCORAS.exercicio, dia: ANCORAS.dia, bloco: ANCORAS.bloco })}
- Saúde, lesões, equipamentos, disponibilidade e experiência são limites reais; nunca os ignore.
- Não diagnostique, não prescreva medicamentos e não prometa resultados.
- Em MODO CONSERVADOR, evite exercícios avançados e volume elevado.
- Prescreva somente exercicioId e padrao existentes no catálogo abaixo, respeitando equipamento e contraindicações.
- O perfilVersao deve ser exatamente o recebido no contexto.
- regraVersao deve ser "agent-plano-v1".
- dadosUsados deve listar os ids dos campos do contexto que fundamentaram o bloco.

Catálogo permitido, uma linha por exercício, campos separados por " | ":
id | padrao | equipamento exigido ("+" = e, "ou" = alternativas) | contraindicações | marcador de técnica avançada
${CATALOGO}`;

export function gerarPlanoTreinoComIA(entrada: EntradaPlano): Promise<ResultadoDecisao<PlanoTreinoGerado>> {
  return decidir({
    userId: entrada.userId,
    operacao: "plano-treino",
    nucleo: entrada.nucleo,
    dados: montarDadosPlano(entrada),
    imagens: entrada.fotosCorporais?.map(({ dados, mediaType }) => ({ dados, mediaType })),
    instrucao: INSTRUCAO,
    schema: planoTreinoSchema,
    origem: entrada.origem,
  });
}

export type { BlocoTreino };
