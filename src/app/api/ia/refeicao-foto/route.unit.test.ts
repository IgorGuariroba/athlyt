import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
/**
 * Assinatura só do que o teste usa do serviço mockado. Tipar o `vi.fn`
 * é o que dá checagem de compilação aos eventos de progresso emitidos
 * e às leituras da chamada registrada.
 */
const estimarRefeicao = vi.fn<
  (fd: FormData, opcoes: { userId: string; signal?: AbortSignal; aoProgresso?: (evento: { tipo: string }) => void }) => Promise<unknown>
>();
vi.mock("@/auth", () => ({ auth }));
vi.mock("@/app/(app)/diario/registrar/foto/servico", () => ({ estimarRefeicao }));

const { POST } = await import("./route");

beforeEach(() => {
  auth.mockReset();
  estimarRefeicao.mockReset();
});

describe("POST /api/ia/refeicao-foto", () => {
  it("autentica e transmite progresso até uma única estimativa final", async () => {
    auth.mockResolvedValue({ user: { id: "u1" } });
    estimarRefeicao.mockImplementation(async (_fd, opcoes) => {
      opcoes.aoProgresso?.({ tipo: "inicio" });
      opcoes.aoProgresso?.({ tipo: "alternativa" });
      opcoes.aoProgresso?.({ tipo: "ultima-alternativa" });
      return { ok: true, estimativa: { nome: "Almoço", itens: [] } };
    });
    const form = new FormData();
    form.set("foto", new File(["foto"], "foto.webp", { type: "image/webp" }));
    const resposta = await POST({
      formData: async () => form,
      signal: new AbortController().signal,
    } as unknown as Request);

    // Cada linha do SSE é um JSON do próprio endpoint; o recast declara
    // o campo que o teste afirma, e o payload completo segue verificado
    // pelos toEqual abaixo.
    const eventos = (await resposta.text()).trim().split("\n").map((linha) => JSON.parse(linha) as { tipo?: string });

    expect(eventos.map((evento) => evento.tipo)).toEqual([
      "inicio",
      "alternativa",
      "ultima-alternativa",
      "sucesso",
    ]);
    expect(eventos.filter((evento) => evento.tipo === "sucesso")).toHaveLength(1);
    expect(JSON.stringify(eventos)).not.toMatch(/gemini|gpt|glm|google-vertex|openai|z-ai/i);
    expect(estimarRefeicao).toHaveBeenCalledWith(expect.any(FormData), expect.objectContaining({ userId: "u1", signal: expect.any(AbortSignal) }));
  });

  it("recusa requisição sem sessão antes de processar a foto", async () => {
    auth.mockResolvedValue(null);
    const resposta = await POST(new Request("http://localhost/api/ia/refeicao-foto", { method: "POST" }));
    expect(resposta.status).toBe(401);
    expect(estimarRefeicao).not.toHaveBeenCalled();
  });
});
