import { z } from "zod";
import { decidir, type ResultadoDecisao } from "../decidir";
import { ANCORAS, explicacaoAncoradaEm, regrasDeExplicacao } from "./plano-explicacao";
import { montarDadosPlano, type EntradaPlano } from "./plano-dados";

export const planoNutricaoSchema = z.object({
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
      explicacao: explicacaoAncoradaEm(ANCORAS.refeicao),
    })),
    explicacoes: z.object({
      calorias: explicacaoAncoradaEm(ANCORAS.calorias),
      proteinaG: explicacaoAncoradaEm(ANCORAS.proteinaG),
      carboidratosG: explicacaoAncoradaEm(ANCORAS.carboidratosG),
      gordurasG: explicacaoAncoradaEm(ANCORAS.gordurasG),
      estrategia: explicacaoAncoradaEm(ANCORAS.estrategia),
    }),
  }),
  dadosUsados: z.array(z.string()),
});

export type PlanoNutricaoGerado = z.infer<typeof planoNutricaoSchema>;

const INSTRUCAO = `Você é o agent de nutrição do Athlyt. Gere a estratégia nutricional inicial de um atleta natural.

Regras obrigatórias:
- Use todas as informações fornecidas e explique escolhas específicas.
${regrasDeExplicacao({
  calorias: ANCORAS.calorias,
  proteinaG: ANCORAS.proteinaG,
  carboidratosG: ANCORAS.carboidratosG,
  gordurasG: ANCORAS.gordurasG,
  estrategia: ANCORAS.estrategia,
  refeicao: ANCORAS.refeicao,
})}
- Ao existir uma medição de percentual de gordura em linha-base-corporal.gorduras, considere-a obrigatoriamente no cálculo: estime a massa livre de gordura (peso × (1 − percentual)) e use-a para calibrar a manutenção (por exemplo, Cunningham/Katch-McArdle), em vez de tratar todo o peso como massa metabolicamente ativa. Se não houver medição, declare que ela não estava disponível e use a equação baseada em peso, altura, idade e sexo.
- Exemplo de calorias bem explicadas: "Estimei sua manutenção a partir de 80 kg, 180 cm e 35 anos, com fator de atividade moderado, ajustando a estimativa pela sua massa livre de gordura de acordo com o percentual de gordura registrado, e acrescentei um superávit leve pelo seu objetivo de ganhar massa."
- Restrições alimentares, orçamento, tempo de preparo, sono e objetivo são limites reais; nunca os ignore.
- Não diagnostique, não prescreva medicamentos e não prometa resultados.
- Em MODO CONSERVADOR, evite estratégia energética agressiva.
- Refeições devem trazer alimentos e quantidades em texto, respeitando restrições, orçamento e tempo de preparo.
- dadosUsados deve listar os ids dos campos do contexto que fundamentaram a estratégia.`;

export function gerarPlanoNutricaoComIA(entrada: EntradaPlano): Promise<ResultadoDecisao<PlanoNutricaoGerado>> {
  return decidir({
    userId: entrada.userId,
    operacao: "plano-nutricao",
    nucleo: entrada.nucleo,
    consentimentos: entrada.consentimentos,
    dados: montarDadosPlano(entrada),
    imagens: entrada.fotosCorporais?.map(({ dados, mediaType }) => ({ dados, mediaType })),
    instrucao: INSTRUCAO,
    schema: planoNutricaoSchema,
    origem: entrada.origem,
  });
}
