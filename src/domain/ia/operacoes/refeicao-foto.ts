import { z } from "zod";
import type { NucleoContexto } from "../contexto/nucleo";
import { decidir, type ResultadoDecisao } from "../decidir";

/**
 * Estimativa de refeição a partir da foto do prato (Recorte
 * `refeicao-foto`; CONTEXT.md > Atalhos de Registro: "foto via IA").
 *
 * O schema é deliberadamente conservador em dois pontos:
 *
 * - cada item declara `quantidadeGramas` estimada **e** a confiança
 *   daquele item. Uma foto identifica bem *o que* está no prato e mal
 *   *quanto* — separar as duas coisas permite a tela pedir ajuste só
 *   da porção, que é o que costuma estar errado;
 * - `limitacoes` não é enfeite: ângulo, oclusão (arroz debaixo do
 *   bife), molho invisível e ausência de referência de escala mudam
 *   materialmente a estimativa, e a user story 59 proíbe estimativa
 *   que se passe por medição.
 *
 * O resultado nunca é gravado direto: ele vira Prato editável, e o
 * atleta confirma. A IA propõe, o atleta registra.
 */
export const refeicaoFotoSchema = z.object({
  nome: z.string().min(1).max(60),
  itens: z
    .array(
      z.object({
        descricao: z.string().min(1).max(80),
        quantidadeGramas: z.number().min(1).max(3000),
        calorias: z.number().min(0).max(5000),
        proteinaG: z.number().min(0).max(400),
        carboidratosG: z.number().min(0).max(700),
        gordurasG: z.number().min(0).max(400),
        fibrasG: z.number().min(0).max(100),
        confianca: z.enum(["alta", "media", "baixa"]),
      }),
    )
    .min(1)
    .max(12),
  limitacoes: z.array(z.string()).max(5),
  /** Confiança do conjunto — nunca melhor que a do pior item relevante. */
  confianca: z.enum(["alta", "media", "baixa"]),
});

export type RefeicaoEstimada = z.infer<typeof refeicaoFotoSchema>;

const INSTRUCAO = `Você estima a composição de uma refeição a partir de uma foto do prato, para um atleta que registra alimentação.
Regras obrigatórias:
- Liste apenas alimentos que você realmente vê. Não complete a refeição com o que "costuma" acompanhar.
- Estime a massa de cada alimento em gramas usando referências de escala visíveis (prato, talher, mão). Sem referência de escala, declare isso em limitações e reduza a confiança.
- Óleo, manteiga e molho usados no preparo costumam ser invisíveis: quando o preparo os sugerir, inclua-os como item próprio com confiança baixa, em vez de ignorá-los.
- A confiança de cada item reflete a incerteza da porção, não só a identificação do alimento.
- A confiança do conjunto nunca é melhor que a do item que mais pesa em energia.
- Ângulo, oclusão, iluminação, prato fundo e mistura homogênea entram em limitações.
- Nomeie a refeição em português do Brasil, de forma curta e descritiva ("Almoço: arroz, feijão e frango").
- Esta é uma estimativa, não uma medição. Nunca finja precisão que a foto não sustenta.`;

export async function estimarRefeicaoPorFoto(entrada: {
  userId: string;
  nucleo: NucleoContexto;
  foto: { dados: Uint8Array; mediaType: string };
  /** Energia e macros que ainda faltam no dia; ajuda a calibrar porções plausíveis. */
  metasRestantes?: unknown;
  restricoes?: readonly string[];
  /** Observação livre do atleta ("o arroz é integral", "comi metade"). */
  observacao?: string;
}): Promise<ResultadoDecisao<RefeicaoEstimada>> {
  return decidir({
    userId: entrada.userId,
    operacao: "refeicao-foto",
    nucleo: entrada.nucleo,
    consentimentos: ["foto-refeicao", "metas-restantes", "restricoes"],
    dados: {
      "foto-refeicao": {
        enviada: true,
        observacaoDoAtleta: entrada.observacao?.trim() || undefined,
      },
      "metas-restantes": entrada.metasRestantes,
      restricoes: entrada.restricoes?.length ? [...entrada.restricoes] : undefined,
    },
    imagens: [entrada.foto],
    instrucao: INSTRUCAO,
    schema: refeicaoFotoSchema,
    origem: {
      tela: "Registrar por foto",
      rota: "/diario/registrar/foto",
      gatilho: "envio-de-foto-do-prato",
    },
  });
}
