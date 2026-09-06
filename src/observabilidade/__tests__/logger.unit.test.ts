import { describe, expect, it } from "vitest";
import { Writable } from "node:stream";
import { criarLogger } from "../logger";

describe("logger", () => {
  it("serializa exceções por allowlist sem copiar payloads enriquecidos do SDK", () => {
    let json = "";
    const destino = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        json += chunk.toString();
        callback();
      },
    });
    const marcador = "SEGREDO_FOTO_BASE64";
    const erro = Object.assign(new Error(`falhou ${marcador}`), {
      statusCode: 429,
      requestBody: { messages: [{ image: `data:image/webp;base64,${marcador}` }] },
      responseBody: marcador,
      headers: { cookie: marcador, authorization: marcador },
      profile: { nome: marcador, userId: marcador },
      cause: new AggregateError([new Error(marcador)], marcador),
      errors: [new Error(marcador)],
    });

    criarLogger(destino).error({
      err: erro,
      categoria: "limite-taxa",
      operacao: "refeicao-foto",
      rotaSolicitada: "google/gemini-2.5-flash-lite@google-vertex/eu",
      statusHttp: 429,
      chamadas: 2,
      esgotada: true,
      sdk: { erros: [erro], causa: erro },
    }, "decisão de IA indisponível");

    // O evento é o JSON que o próprio logger escreveu; o recast declara
    // a forma mínima que os toEqual abaixo afirmam.
    const evento = JSON.parse(json) as {
      err: Record<string, unknown>;
      sdk: { erros: { tipo?: string }[]; causa: { tipo?: string } };
    };
    expect(evento).toMatchObject({
      categoria: "limite-taxa",
      operacao: "refeicao-foto",
      statusHttp: 429,
      chamadas: 2,
      esgotada: true,
      err: { tipo: "Error" },
    });
    expect(json).not.toContain(marcador);
    expect(json.length).toBeLessThan(16 * 1024);
    expect(Object.keys(evento.err)).toEqual(["tipo"]);
    expect(evento.sdk).toEqual({ erros: [{ tipo: "Error" }], causa: { tipo: "Error" } });
  });
});
