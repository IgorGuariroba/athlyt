import { z } from "zod";
import type { NucleoContexto } from "../contexto/nucleo";
import { decidir, type ResultadoDecisao } from "../decidir";

export const avaliacaoVisualSchema = z.object({
  criterios: z.object({
    vTaper: z.number().int().min(0).max(100),
    ombros: z.number().int().min(0).max(100),
    cintura: z.number().int().min(0).max(100),
    equilibrio: z.number().int().min(0).max(100),
    simetria: z.number().int().min(0).max(100),
  }),
  gorduraVisual: z.object({ minimoPercentual: z.number().min(2).max(68), maximoPercentual: z.number().min(4).max(70) }).refine((faixa) => faixa.maximoPercentual - faixa.minimoPercentual >= 2, "Use uma faixa com pelo menos 2 pontos percentuais"),
  observacoes: z.array(z.string()).max(6),
  limitacoes: z.array(z.string()).max(6),
});

const INSTRUCAO = `Você faz uma avaliação visual corporal conservadora para acompanhamento longitudinal de um atleta natural.
Regras obrigatórias:
- Avalie V-taper, ombros, cintura, equilíbrio do conjunto e simetria separadamente; nunca produza nota corporal única.
- Gordura visual é somente uma faixa probabilística com pelo menos 2 pontos percentuais de largura, nunca percentual exato.
- Não diagnostique, sexualize, humilhe ou infira saúde clínica pela aparência.
- Não use condição temporária de palco como referência permanente.
- Iluminação, pose, distância, roupa ou baixa visibilidade entram em limitações e reduzem confiança.
- Foto isolada não justifica mudança do Plano Ativo.
- Saúde, recuperação e sustentabilidade prevalecem sobre estética.`;

export async function analisarFotosCorporais(entrada: {
  userId: string;
  nucleo: NucleoContexto;
  fotos: readonly { id: string; pose: string; condicoes?: string | null; dados: Uint8Array; mediaType: string }[];
  medicoesComparaveis: unknown;
}) {
  const decisao = {
    userId: entrada.userId,
    operacao: "avaliacao-visual",
    nucleo: entrada.nucleo,
    dados: {
      "fotos-corporais": entrada.fotos.map(({ id, pose }) => ({ id, pose })),
      "medicoes-comparaveis": entrada.medicoesComparaveis,
      "condicoes-captura": entrada.fotos.map(({ pose, condicoes }) => ({ pose, condicoes })),
    },
    imagens: entrada.fotos.map(({ dados, mediaType }) => ({ dados, mediaType })),
    instrucao: INSTRUCAO,
    schema: avaliacaoVisualSchema,
  } as const;
  let resultado: ResultadoDecisao<z.infer<typeof avaliacaoVisualSchema>> | undefined;
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    resultado = await decidir(decisao);
    if (resultado.status === "ok") return resultado;
  }
  return resultado!;
}
