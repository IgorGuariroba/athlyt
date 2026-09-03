import { z } from "zod";
import { decidir, type ResultadoDecisao } from "../decidir";
import { ANCORAS, explicacaoAncoradaEm, regrasDeExplicacao } from "./plano-explicacao";
import { montarDadosPlano, type EntradaPlano } from "./plano-dados";

const itemPlanejadoSchema = z.object({
  nome: z.string().min(1).max(80),
  /** Medida que o atleta reconhece: "2 fatias", "1 unidade". */
  porcaoDescrita: z.string().min(1).max(60),
  /** Equivalente usado na aritmética nutricional. */
  quantidade: z.number().positive().max(3000),
  unidade: z.enum(["g", "ml"]),
  calorias: z.number().nonnegative().max(5000),
  proteinaG: z.number().nonnegative().max(400),
  carboidratosG: z.number().nonnegative().max(700),
  gordurasG: z.number().nonnegative().max(400),
  fibrasG: z.number().nonnegative().max(100),
  confianca: z.enum(["alta", "media", "baixa"]),
});

const refeicaoPlanejadaSchema = z.object({
  nome: z.string(),
  percentual: z.number().min(0).max(100),
  calorias: z.number().int().nonnegative(),
  proteinaG: z.number().int().nonnegative(),
  itens: z.array(itemPlanejadoSchema).min(1),
  explicacao: explicacaoAncoradaEm(ANCORAS.refeicao),
}).superRefine((refeicao, contexto) => {
  const total = refeicao.itens.reduce(
    (soma, item) => ({
      calorias: soma.calorias + item.calorias,
      proteinaG: soma.proteinaG + item.proteinaG,
    }),
    { calorias: 0, proteinaG: 0 },
  );
  const fora = (valor: number, meta: number, tolerancia: number) =>
    meta === 0 ? valor !== 0 : Math.abs(valor - meta) / meta > tolerancia;
  if (fora(total.calorias, refeicao.calorias, 0.1)) {
    contexto.addIssue({
      code: "custom",
      path: ["itens"],
      message: "A soma dos itens deve ficar a até 10% da energia da refeição.",
    });
  }
  if (fora(total.proteinaG, refeicao.proteinaG, 0.15)) {
    contexto.addIssue({
      code: "custom",
      path: ["itens"],
      message: "A soma dos itens deve ficar a até 15% da proteína da refeição.",
    });
  }
});

export const planoNutricaoSchema = z.object({
  nutricao: z.object({
    calorias: z.number().int().positive(),
    proteinaG: z.number().int().nonnegative(),
    carboidratosG: z.number().int().nonnegative(),
    gordurasG: z.number().int().nonnegative(),
    fibrasG: z.number().int().nonnegative(),
    estrategia: z.string(),
    refeicoes: z.array(refeicaoPlanejadaSchema),
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
- Cada item da refeição deve trazer nome, porção em linguagem reconhecível (porcaoDescrita), equivalente nutricional em g ou ml e macros próprios para essa quantidade.
- A soma dos itens deve ficar a até 10% das calorias e 15% da proteína da refeição. Ajuste porções ou composição; nunca altere macros só para fechar a conta.
- Porções precisam ser executáveis: gramas e líquidos em incrementos práticos; ovos, frutas e fatias em números inteiros ou meios quando isso for natural. Nunca prescreva "2,37 ovos".
- Respeite restrições, orçamento e tempo de preparo.
- dadosUsados deve listar os ids dos campos do contexto que fundamentaram a estratégia.`;

export function gerarPlanoNutricaoComIA(entrada: EntradaPlano): Promise<ResultadoDecisao<PlanoNutricaoGerado>> {
  return decidir({
    userId: entrada.userId,
    operacao: "plano-nutricao",
    nucleo: entrada.nucleo,
    dados: montarDadosPlano(entrada),
    imagens: entrada.fotosCorporais?.map(({ dados, mediaType }) => ({ dados, mediaType })),
    instrucao: INSTRUCAO,
    schema: planoNutricaoSchema,
    origem: entrada.origem,
  });
}
