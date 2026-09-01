import { z } from "zod";
import type { NucleoContexto } from "../contexto/nucleo";
import { decidir, type ResultadoDecisao } from "../decidir";

/**
 * Estimativa de refeição a partir da descrição escrita ou da
 * transcrição de um áudio.
 *
 * O schema é irmão do de `refeicao-foto` e difere no ponto que muda a
 * natureza do palpite: aqui a incerteza está na **porção que o atleta
 * descreveu em linguagem comum** ("uma colher de arroz"), não no que o
 * modelo consegue ver. Por isso cada item carrega, além da quantidade
 * estimada, a `porcaoDescrita` que originou o número — é ela que o
 * atleta reconhece ao revisar e é ela que torna o registro auditável
 * depois.
 *
 * A `unidade` é do modelo, como em `refeicao-foto`: quem diz "tomei
 * uma lata de refrigerante" descreve volume, e traduzir isso para
 * gramas exigiria uma densidade que ninguém informou.
 *
 * `limitacoes` não é enfeite: descrição sem quantidade, preparo
 * desconhecido e gordura de preparo não mencionada mudam
 * materialmente a estimativa; por isso, ela nunca pode se passar por
 * medição.
 *
 * O resultado nunca é gravado direto: vira Prato editável, e o atleta
 * confirma. A IA propõe, o atleta registra.
 */
export const refeicaoTextoSchema = z.object({
  nome: z.string().min(1).max(60),
  itens: z
    .array(
      z.object({
        descricao: z.string().min(1).max(80),
        /** A porção como o atleta a descreveu ("uma colher de sopa"). */
        porcaoDescrita: z.string().min(1).max(60),
        quantidade: z.number().min(1).max(3000),
        unidade: z.enum(["g", "ml"]),
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

export type RefeicaoDescrita = z.infer<typeof refeicaoTextoSchema>;

const INSTRUCAO = `Você estima a composição de uma refeição a partir da descrição que o próprio atleta fez do que comeu.
Regras obrigatórias:
- Liste apenas alimentos sustentados pela descrição. Nunca complete a refeição com o que "costuma" acompanhar.
- Converta porções em linguagem comum ("uma colher de arroz", "uma fatia de presunto", "um prato", "uma lata de refrigerante") para quantidades plausíveis do Brasil, e repita em porcaoDescrita a porção exatamente como o atleta a descreveu.
- Meça bebidas e alimentos líquidos em ml (refrigerante, suco, café, leite, sopa, iogurte de beber) e todo o resto em g. Nunca converta volume em massa: responda na unidade em que a porção foi descrita.
- Respeite as versões que o atleta nomeou: zero, diet, light, integral, desnatado e sem açúcar têm composição própria e nunca devem receber os valores da versão tradicional.
- Quando a descrição não disser a quantidade, assuma uma porção usual, declare isso em limitações e use confiança baixa para aquele item.
- Óleo, manteiga e açúcar de preparo costumam ficar de fora da descrição: só os inclua quando o preparo descrito os exigir, como item próprio e com confiança baixa.
- A confiança de cada item reflete a incerteza da porção, não só a identificação do alimento.
- A confiança do conjunto nunca é melhor que a do item que mais pesa em energia.
- As metas restantes do dia servem apenas para calibrar porções plausíveis. Nunca ajuste a estimativa para fechar a meta: o registro descreve o que foi comido, não o que deveria ter sido.
- Nomeie a refeição em português do Brasil, de forma curta e descritiva ("Almoço: arroz, feijão e frango").
- Esta é uma estimativa de memória, não uma medição. Nunca finja precisão que a descrição não sustenta.`;

export async function estimarRefeicaoPorDescricao(entrada: {
  userId: string;
  nucleo: NucleoContexto;
  /** Texto escrito pelo atleta ou transcrição revisada do áudio. */
  descricao: string;
  /** Como a descrição chegou; entra no prompt porque áudio transcrito erra palavras. */
  origemDescricao: "texto" | "audio";
  /** Energia e macros que ainda faltam no dia; ajuda a calibrar porções plausíveis. */
  metasRestantes?: unknown;
  restricoes?: readonly string[];
}): Promise<ResultadoDecisao<RefeicaoDescrita>> {
  return decidir({
    userId: entrada.userId,
    operacao: "refeicao-texto",
    nucleo: entrada.nucleo,
    consentimentos: ["descricao-livre", "metas-restantes", "restricoes"],
    dados: {
      "descricao-livre": {
        texto: entrada.descricao.trim(),
        origem:
          entrada.origemDescricao === "audio"
            ? "transcrição de áudio revisada pelo atleta"
            : "texto escrito pelo atleta",
      },
      "metas-restantes": entrada.metasRestantes,
      restricoes: entrada.restricoes?.length ? [...entrada.restricoes] : undefined,
    },
    instrucao: INSTRUCAO,
    schema: refeicaoTextoSchema,
    origem: {
      tela: "Registrar por descrição",
      rota: "/diario/registrar/descricao",
      gatilho:
        entrada.origemDescricao === "audio"
          ? "descricao-por-audio-transcrito"
          : "descricao-escrita-do-atleta",
    },
  });
}
