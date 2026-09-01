import { z } from "zod";
import type { UnidadeEstimada } from "@/domain/alimentos/prato";
import type { NucleoContexto } from "../contexto/nucleo";
import { decidir, type OrigemDecisao, type ResultadoDecisao } from "../decidir";

/**
 * Energia e macros de **um** alimento em uma quantidade dada.
 *
 * Serve foto, texto e áudio: a pergunta é a mesma nos três, porque o
 * que se corrige é o alimento, não o modo como ele foi capturado. Por
 * isso a `origem` da Trilha vem de quem chama — fixar a tela aqui
 * faria o recalculo pela foto ficar registrado como se tivesse
 * nascido na tela de descrição, mentindo justo na auditoria.
 *
 * Existe porque corrigir o nome de um item na revisão pode trocar o
 * alimento, e não só o rótulo: "refrigerante de cola" para
 * "refrigerante de cola zero" zera 105 kcal e 27 g de carboidrato. Sem
 * uma forma de recalcular só aquele item, o atleta escolhia entre
 * gravar o nome certo com números errados ou refazer a refeição
 * inteira.
 *
 * É uma operação separada de `refeicao-texto` porque a pergunta é
 * outra e o contexto enviado é menor: aqui não há descrição da
 * refeição, metas do dia nem os outros itens do prato — só o alimento
 * e a porção. Reaproveitar a operação da refeição obrigaria a mandar
 * de volta o prato todo para corrigir uma linha, e devolveria um prato
 * novo onde o atleta pediu um item.
 *
 * Não decide quantidade nem unidade: as duas são as que estão na
 * tela, corrigidas ou não pelo atleta. O modelo responde apenas
 * quanto aquilo custa em energia e macros — e responde para os 250 ml
 * que lhe foram ditos, sem converter em gramas por conta própria.
 */
export const alimentoMacrosSchema = z.object({
  calorias: z.number().min(0).max(5000),
  proteinaG: z.number().min(0).max(400),
  carboidratosG: z.number().min(0).max(700),
  gordurasG: z.number().min(0).max(400),
  fibrasG: z.number().min(0).max(100),
  confianca: z.enum(["alta", "media", "baixa"]),
});

export type MacrosDeAlimento = z.infer<typeof alimentoMacrosSchema>;

const INSTRUCAO = `Você informa energia e macronutrientes de um único alimento, na quantidade indicada.
Regras obrigatórias:
- Responda para o alimento exatamente como ele foi nomeado, e para a quantidade e a unidade informadas.
- A unidade informada é a da resposta: quando a quantidade vier em ml, responda para aquele volume e nunca o converta em gramas.
- Versões "zero", "diet", "light", "integral", "desnatado" e "sem açúcar" têm composição própria: nunca responda com os valores da versão tradicional.
- Use valores de referência do Brasil (tabelas TACO/IBGE ou rótulo comercial típico) para alimentos industrializados.
- Quando o nome for genérico ou ambíguo demais para uma composição específica, use a preparação mais comum e responda com confiança baixa.
- Não arredonde para números "bonitos" nem ajuste para fechar meta alguma: a resposta descreve o alimento, não um objetivo.
- Esta é uma estimativa de composição, não uma medição do que foi de fato ingerido.`;

export async function estimarMacrosDoAlimento(entrada: {
  userId: string;
  nucleo: NucleoContexto;
  /** Nome do alimento como o atleta o corrigiu na revisão. */
  alimento: string;
  quantidade: number;
  unidade: UnidadeEstimada;
  /** Tela de onde partiu a correção; entra na Trilha de Decisão. */
  origem: OrigemDecisao;
}): Promise<ResultadoDecisao<MacrosDeAlimento>> {
  return decidir({
    userId: entrada.userId,
    operacao: "alimento-macros",
    nucleo: entrada.nucleo,
    consentimentos: ["alimento-corrigido"],
    dados: {
      "alimento-corrigido": {
        alimento: entrada.alimento.trim(),
        quantidade: entrada.quantidade,
        unidade: entrada.unidade,
      },
    },
    instrucao: INSTRUCAO,
    schema: alimentoMacrosSchema,
    origem: entrada.origem,
  });
}
