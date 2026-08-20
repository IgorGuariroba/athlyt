import { describe, expect, it, vi } from "vitest";
import type { StoragePrivado } from "@/infra/storage";

// A rota importa `@/auth` (NextAuth) no escopo do módulo só para
// montar o handler padrão exportado como `GET`; este teste exercita
// `criarHandlerMidiaExecucao` isoladamente, então o auth real nunca é
// chamado — o stub evita puxar `next-auth` (e sua dependência de
// `next/server`) para dentro do ambiente jsdom do Vitest.
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const { criarHandlerMidiaExecucao } = await import("../[exercicioId]/route");

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
      midiaDoExercicio: () => ({ exerciseId: "EIeI8Vf", nomeOrigem: "barbell bench press", chaveObjeto: "midia-execucao/supino-barra.gif" }),
      obterStorage: () => storageFake(),
    });

    const resposta = await handler("supino-barra");

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toBe("image/gif");
    expect(new Uint8Array(await resposta.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("devolve 404 quando o exercício não tem mídia mapeada", async () => {
    const handler = criarHandlerMidiaExecucao({
      autenticado: async () => true,
      midiaDoExercicio: () => undefined,
      obterStorage: () => storageFake(),
    });

    const resposta = await handler("id-sem-mapeamento");

    expect(resposta.status).toBe(404);
  });

  it("devolve 404 (falha fechada) quando o R2 não está configurado, sem 500", async () => {
    const handler = criarHandlerMidiaExecucao({
      autenticado: async () => true,
      midiaDoExercicio: () => ({ exerciseId: "EIeI8Vf", nomeOrigem: "barbell bench press", chaveObjeto: "midia-execucao/supino-barra.gif" }),
      obterStorage: () => null,
    });

    const resposta = await handler("supino-barra");

    expect(resposta.status).toBe(404);
  });

  it("devolve 401 quando não há sessão autenticada", async () => {
    const handler = criarHandlerMidiaExecucao({
      autenticado: async () => false,
      midiaDoExercicio: () => ({ exerciseId: "EIeI8Vf", nomeOrigem: "barbell bench press", chaveObjeto: "midia-execucao/supino-barra.gif" }),
      obterStorage: () => storageFake(),
    });

    const resposta = await handler("supino-barra");

    expect(resposta.status).toBe(401);
  });
});
