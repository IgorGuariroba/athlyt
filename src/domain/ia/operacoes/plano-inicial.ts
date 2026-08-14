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

export function gerarPlanoInicialComIA(entrada: EntradaPlanoInicial): Promise<ResultadoDecisao<PlanoGerado>> {
  return decidir({
    userId: entrada.userId,
    operacao: "plano-inicial",
    nucleo: entrada.nucleo,
    consentimentos: entrada.consentimentos,
    dados: {
      "triagem-completa": entrada.triagemCompleta,
      "linha-base-corporal": entrada.linhaBaseCorporal,
      "metas-proporcao": entrada.metasProporcao,
      "historico-importado": entrada.historicoImportado,
    },
    instrucao: INSTRUCAO,
    schema: planoInicialSchema,
    origem: entrada.origem,
  });
}
