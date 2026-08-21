import { describe, expect, it } from "vitest";
import type { StoragePrivado } from "@/infra/storage";
import { criarHandlerMidiaExecucao } from "../[exercicioId]/handler";

const MIDIA_SUPINO = {
  exerciseId: "EIeI8Vf",
  nomeOrigem: "barbell bench press",
  chaveObjeto: "midia-execucao/supino-barra.gif",
} as const;

/** Storage cujo objeto ainda não foi espelhado — o miss que aciona o download. */
function storageVazio(overrides: Partial<StoragePrivado> = {}): StoragePrivado {
  return storageFake({
    existe: async () => false,
    ler: async () => {
      throw new Error("NoSuchKey");
    },
    ...overrides,
  });
}

/**
 * Rota de mídia (CONTEXT.md, Mídia de Execução): serve o GIF espelhado
 * no R2 same-origin, para caber no cache do service worker. Precisa
 * falhar fechada — nunca 500 — porque a ficha do exercício depende do
 * fallback em texto continuar acessível mesmo sem storage configurado.
 */
function storageFake(overrides: Partial<StoragePrivado> = {}): StoragePrivado {
  return {
    gravar: async () => {},
    existe: async () => true,
    ler: async () => ({ corpo: new Uint8Array([1, 2, 3]), contentType: "image/gif" }),
    urlLeitura: async () => "https://exemplo.invalido/assinada",
    excluir: async () => {},
    ...overrides,
  };
}

describe("GET /api/midia-execucao/[exercicioId]", () => {
  it("devolve 200 com os bytes do GIF quando há mapeamento e o objeto existe no storage", async () => {
    const handler = criarHandlerMidiaExecucao({
      autenticado: async () => true,
      midiaDoExercicio: () => MIDIA_SUPINO,
      obterStorage: () => storageFake(),
      baixarGifDeOrigem: async () => null,
    });

    const resposta = await handler("supino-barra");

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toBe("image/gif");
    expect(new Uint8Array(await resposta.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  /**
   * O espelhamento é um passo manual fora do deploy, então bucket sem
   * o objeto é o estado normal de um ambiente recém-provisionado —
   * antes, degradava toda ficha para o diagrama em silêncio.
   */
  it("espelha o GIF de origem e o serve quando o objeto ainda não está no bucket", async () => {
    const gravados: { chave: string; contentType: string }[] = [];
    const handler = criarHandlerMidiaExecucao({
      autenticado: async () => true,
      midiaDoExercicio: () => MIDIA_SUPINO,
      obterStorage: () =>
        storageVazio({
          gravar: async ({ chave, contentType }) => {
            gravados.push({ chave, contentType });
          },
        }),
      baixarGifDeOrigem: async () => new Uint8Array([7, 7, 7]),
    });

    const resposta = await handler("supino-barra");

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toBe("image/gif");
    expect(new Uint8Array(await resposta.arrayBuffer())).toEqual(new Uint8Array([7, 7, 7]));
    expect(gravados).toEqual([{ chave: MIDIA_SUPINO.chaveObjeto, contentType: "image/gif" }]);
  });

  it("usa o exerciseId do mapa curado ao baixar, não o id do catálogo Athlyt", async () => {
    const pedidos: string[] = [];
    const handler = criarHandlerMidiaExecucao({
      autenticado: async () => true,
      midiaDoExercicio: () => MIDIA_SUPINO,
      obterStorage: () => storageVazio(),
      baixarGifDeOrigem: async (exerciseId) => {
        pedidos.push(exerciseId);
        return new Uint8Array([7]);
      },
    });

    await handler("supino-barra");

    expect(pedidos).toEqual([MIDIA_SUPINO.exerciseId]);
  });

  it("devolve 404 quando o objeto falta e a origem está indisponível", async () => {
    const handler = criarHandlerMidiaExecucao({
      autenticado: async () => true,
      midiaDoExercicio: () => MIDIA_SUPINO,
      obterStorage: () => storageVazio(),
      baixarGifDeOrigem: async () => null,
    });

    const resposta = await handler("supino-barra");

    expect(resposta.status).toBe(404);
  });

  it("serve o GIF baixado mesmo se a gravação no R2 falhar", async () => {
    const handler = criarHandlerMidiaExecucao({
      autenticado: async () => true,
      midiaDoExercicio: () => MIDIA_SUPINO,
      obterStorage: () =>
        storageVazio({
          gravar: async () => {
            throw new Error("AccessDenied");
          },
        }),
      baixarGifDeOrigem: async () => new Uint8Array([7, 7, 7]),
    });

    const resposta = await handler("supino-barra");

    expect(resposta.status).toBe(200);
    expect(new Uint8Array(await resposta.arrayBuffer())).toEqual(new Uint8Array([7, 7, 7]));
  });

  it("devolve 404 quando o exercício não tem mídia mapeada", async () => {
    const handler = criarHandlerMidiaExecucao({
      autenticado: async () => true,
      midiaDoExercicio: () => undefined,
      obterStorage: () => storageFake(),
      baixarGifDeOrigem: async () => new Uint8Array([7]),
    });

    const resposta = await handler("id-sem-mapeamento");

    expect(resposta.status).toBe(404);
  });

  it("devolve 404 (falha fechada) quando o R2 não está configurado, sem 500", async () => {
    const handler = criarHandlerMidiaExecucao({
      autenticado: async () => true,
      midiaDoExercicio: () => MIDIA_SUPINO,
      obterStorage: () => null,
      baixarGifDeOrigem: async () => new Uint8Array([7]),
    });

    const resposta = await handler("supino-barra");

    expect(resposta.status).toBe(404);
  });

  it("devolve 401 quando não há sessão autenticada", async () => {
    const handler = criarHandlerMidiaExecucao({
      autenticado: async () => false,
      midiaDoExercicio: () => MIDIA_SUPINO,
      obterStorage: () => storageFake(),
      baixarGifDeOrigem: async () => new Uint8Array([7]),
    });

    const resposta = await handler("supino-barra");

    expect(resposta.status).toBe(401);
  });
});
