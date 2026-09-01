import { z } from "zod";
import type { NucleoContexto } from "../contexto/nucleo";
import { decidir, type ResultadoDecisao } from "../decidir";
import { LIMITE_DESCRICAO } from "@/domain/alimentos/audio-refeicao";

/**
 * Transcrição do áudio em que o atleta descreve a refeição.
 *
 * É uma operação separada da estimativa de propósito. Pedir ao mesmo
 * modelo, na mesma chamada, que ouça e calcule macros tiraria do
 * atleta um passo obrigatório: rever a transcrição **antes** de qualquer
 * número existir. Um "duzentos gramas" ouvido como "duzentos
 * quilos" viraria macros errados sem ninguém ver a frase.
 *
 * A saída é texto, não estrutura nutricional: ela alimenta
 * `estimarRefeicaoPorDescricao`, que é o único lugar onde alimento
 * vira macro.
 */
export const refeicaoAudioSchema = z.object({
  /** O que foi dito, em português do Brasil, sem interpretação. */
  transcricao: z.string().min(1).max(LIMITE_DESCRICAO),
  /** Trechos que o modelo não entendeu bem; o atleta corrige antes de estimar. */
  trechosIncertos: z.array(z.string()).max(5),
});

export type TranscricaoRefeicao = z.infer<typeof refeicaoAudioSchema>;

const INSTRUCAO = `Você transcreve um áudio curto em que um atleta descreve o que comeu.
Regras obrigatórias:
- Transcreva em português do Brasil o que foi efetivamente dito. Não resuma, não corrija o conteúdo e não complete a refeição.
- Não estime calorias, macros nem gramas: sua saída é apenas texto falado.
- Escreva números por extenso ou em algarismos como foram ditos, preservando unidades ("duas colheres", "150 gramas").
- Quando um trecho estiver inaudível ou ambíguo, transcreva a melhor hipótese e liste esse trecho em trechosIncertos.
- Se o áudio não descrever comida alguma, devolva a transcrição do que foi dito mesmo assim; quem decide o que fazer com isso é o atleta.`;

export async function transcreverAudioDaRefeicao(entrada: {
  userId: string;
  nucleo: NucleoContexto;
  audio: { dados: Uint8Array; mediaType: string };
}): Promise<ResultadoDecisao<TranscricaoRefeicao>> {
  return decidir({
    userId: entrada.userId,
    operacao: "refeicao-audio",
    nucleo: entrada.nucleo,
    consentimentos: ["audio-refeicao"],
    dados: { "audio-refeicao": { enviado: true } },
    audios: [entrada.audio],
    instrucao: INSTRUCAO,
    schema: refeicaoAudioSchema,
    origem: {
      tela: "Registrar por descrição",
      rota: "/diario/registrar/descricao",
      gatilho: "envio-de-audio-da-refeicao",
    },
  });
}
