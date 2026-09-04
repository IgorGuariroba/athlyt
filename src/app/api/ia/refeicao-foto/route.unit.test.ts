import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
const estimarRefeicao = vi.fn();
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
      opcoes.aoProgresso({ tipo: "inicio", total: 3 });
      opcoes.aoProgresso({ tipo: "alternativa", tentativa: 2, total: 3 });
      opcoes.aoProgresso({ tipo: "ultima-alternativa", tentativa: 3, total: 3 });
      return { ok: true, estimativa: { nome: "Almoço", itens: [] } };
    });
    const form = new FormData();
    form.set("foto", new File(["foto"], "foto.webp", { type: "image/webp" }));
    const resposta = await POST({
      formData: async () => form,
      signal: new AbortController().signal,
    } as unknown as Request);

    const eventos = (await resposta.text()).trim().split("\n").map((linha) => JSON.parse(linha));

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
