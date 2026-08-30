import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { describe, expect, it } from "vitest";

import {
  TIPOS_AUDIO_PROVEDOR,
  TIPOS_AUDIO_REFEICAO,
  TIPO_AUDIO_CONVERTIDO,
  precisaConverterAudio,
} from "../audio-refeicao";

/**
 * Trava a lista de formatos contra o **conversor real** do provedor, e
 * não contra a nossa leitura da documentação dele.
 *
 * A falha que originou este teste ("Não consegui transcrever o áudio")
 * não vinha do modelo: o `@ai-sdk/openai-compatible` lança
 * `UnsupportedFunctionalityError` ao montar a mensagem, antes de a
 * requisição sair da máquina. Nenhum mock reproduz isso, e nenhum teste
 * de integração com o OpenRouter o pegaria — por isso o caminho aqui é
 * chamar o `doGenerate` de verdade apontando para um endereço morto: se
 * a conversão passar, o erro é de rede; se não passar, é o mesmo erro de
 * produção.
 *
 * Se um upgrade do SDK ampliar (ou reduzir) os formatos suportados,
 * este teste falha e a lista é atualizada com evidência.
 */
const modelo = createOpenAICompatible({
  name: "verificacao",
  // Porta inválida: qualquer requisição que chegue a sair falha na rede,
  // então o veredito depende só da etapa de conversão da mensagem.
  baseURL: "http://127.0.0.1:1/v1",
  apiKey: "irrelevante",
}).chatModel("modelo-de-teste");

async function conversaoAceita(mediaType: string): Promise<boolean> {
  try {
    await modelo.doGenerate({
      prompt: [
        {
          role: "user",
          content: [
            { type: "text", text: "transcreva" },
            { type: "file", data: { type: "data", data: new Uint8Array([1, 2, 3]) }, mediaType },
          ],
        },
      ],
    });
    return true;
  } catch (erro) {
    return (erro as Error).name !== "AI_UnsupportedFunctionalityError";
  }
}

describe("formatos de áudio que o cliente do provedor aceita", () => {
  it.each([...TIPOS_AUDIO_PROVEDOR])("envia %s sem erro de conversão", async (mediaType) => {
    expect(await conversaoAceita(mediaType)).toBe(true);
  });

  it.each([...TIPOS_AUDIO_REFEICAO].filter((tipo) => !TIPOS_AUDIO_PROVEDOR.has(tipo)))(
    "%s é recusado na conversão, então precisa ser transcodificado antes",
    async (mediaType) => {
      expect(await conversaoAceita(mediaType)).toBe(false);
      expect(precisaConverterAudio(mediaType)).toBe(true);
    },
  );

  it("o formato de saída da conversão é um dos aceitos pelo provedor", () => {
    expect(TIPOS_AUDIO_PROVEDOR.has(TIPO_AUDIO_CONVERTIDO)).toBe(true);
    expect(precisaConverterAudio(TIPO_AUDIO_CONVERTIDO)).toBe(false);
  });

  it("o que o navegador grava nunca chega cru ao provedor", () => {
    // WebM (Chrome/Firefox) e MP4 (Safari) são o caso comum, não a borda.
    expect(precisaConverterAudio("audio/webm")).toBe(true);
    expect(precisaConverterAudio("audio/mp4")).toBe(true);
  });
});
