// @vitest-environment node
/**
 * Um teste por chamador de produção, atravessando a action até a
 * linha persistida.
 *
 * É a faixa que a issue #203 diagnosticou como vazia: os dois portões
 * de gravação chegavam ao mesmo destino por caminhos com invariantes
 * diferentes, e nenhum teste passava pelo payload do cliente. Este
 * arquivo garante que `registrarPratoAction` e
 * `registrarConsumoRealAction` gravam a mesma proveniência e a mesma
 * descrição para o mesmo payload — porque as duas passam pelo mesmo
 * portão, `reconstruirPratoRevisado`.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { montarDiarioDoDia } from "@/domain/diario/repositorio";
import { itemEstimado, itemManual, type ItemPrato } from "@/domain/alimentos/prato";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`NEXT_REDIRECT:${destino}`);
  },
}));

const { registrarPratoAction } = await import("@/app/(app)/diario/actions");
const { registrarConsumoRealAction } = await import(
  "@/app/(app)/diario/registrar/descricao/actions"
);

const DIA = "2026-05-20";
const FUSO = "America/Sao_Paulo";

let userId: string | undefined;
afterEach(async () => {
  if (userId) await db.delete(users).where(eq(users.id, userId));
  userId = undefined;
  auth.mockReset();
});

function itemDaLinhaDoTempo(diario: Awaited<ReturnType<typeof montarDiarioDoDia>>) {
  const consumo = diario.linhaDoTempo.find((i) => i.tipo === "consumo");
  if (consumo?.tipo !== "consumo") throw new Error("Consumo ausente.");
  return consumo.consumo.itens[0] as unknown as { descricao: string; fonte: string; origemDado: string };
}

describe("os dois portões de gravação do Prato revisado concordam", () => {
  it("registrarPratoAction preserva a origem fotográfica de uma linha recalculada por texto", async () => {
    const [usuario] = await db.insert(users).values({ email: `prato-203-${randomUUID()}@example.com` }).returning();
    userId = usuario!.id;
    auth.mockResolvedValue({ user: { id: userId } });

    // Linha que nasceu de foto e foi recalculada por texto na revisão
    // (reestimarMacros troca a fonte para "texto"): o portão não pode
    // devolvê-la para "foto" só porque a tela era a de foto.
    const linhaRecalculada = itemEstimado({
      descricao: "Coca-Cola Zero", quantidade: 250, unidade: "ml",
      calorias: 0, proteinaG: 0, carboidratosG: 0, gordurasG: 0, fibrasG: 0,
      confianca: "alta", modelo: "modelo-x", origemEstimativa: "texto",
    });

    const fd = new FormData();
    fd.set("dia", DIA);
    fd.set("fuso", FUSO);
    fd.set("nome", "Almoço");
    fd.set("hora", "12:30");
    fd.set("itens", JSON.stringify([linhaRecalculada] satisfies ItemPrato[]));

    await expect(registrarPratoAction(fd)).rejects.toThrow(`NEXT_REDIRECT:/diario?dia=${DIA}`);

    const diario = await montarDiarioDoDia(userId, { dia: DIA, fuso: FUSO });
    const item = itemDaLinhaDoTempo(diario);
    expect(item.fonte).toBe("Estimativa por descrição");
  });

  it("registrarPratoAction não duplica o sufixo de quantidade de um item manual", async () => {
    const [usuario] = await db.insert(users).values({ email: `prato-203-${randomUUID()}@example.com` }).returning();
    userId = usuario!.id;
    auth.mockResolvedValue({ user: { id: userId } });

    // O cliente monta o item com itemManual antes de enviar; a
    // descrição já carrega o sufixo de quantidade.
    const item = itemManual({
      nome: "Marmita da firma", quantidade: 1, unidade: "porção",
      calorias: 700, proteinaG: 40, carboidratosG: 70, gordurasG: 25, fibrasG: 6,
    });

    const fd = new FormData();
    fd.set("dia", DIA);
    fd.set("fuso", FUSO);
    fd.set("nome", "Almoço");
    fd.set("hora", "12:30");
    fd.set("itens", JSON.stringify([item] satisfies ItemPrato[]));

    await expect(registrarPratoAction(fd)).rejects.toThrow(`NEXT_REDIRECT:/diario?dia=${DIA}`);

    const diario = await montarDiarioDoDia(userId, { dia: DIA, fuso: FUSO });
    const gravado = itemDaLinhaDoTempo(diario);
    expect(gravado.descricao).toBe("Marmita da firma 1 porção");
  });

  it("registrarConsumoRealAction recusa macros fora das faixas aceitas", async () => {
    const [usuario] = await db.insert(users).values({ email: `prato-203-${randomUUID()}@example.com` }).returning();
    userId = usuario!.id;
    auth.mockResolvedValue({ user: { id: userId } });

    const item = itemManual({
      nome: "Bomba calórica", quantidade: 5000, unidade: "g",
      calorias: 0, proteinaG: 0, carboidratosG: 0, gordurasG: 0, fibrasG: 0,
    });

    const fd = new FormData();
    fd.set("dia", DIA);
    fd.set("hora", "12:30");
    fd.set("nome", "Almoço");
    fd.set("itens", JSON.stringify([item] satisfies ItemPrato[]));

    const resultado = await registrarConsumoRealAction(fd);
    expect(resultado).toMatchObject({ ok: false });
  });

  it("registrarConsumoRealAction preserva a origem por item, tal qual registrarPratoAction", async () => {
    const [usuario] = await db.insert(users).values({ email: `prato-203-${randomUUID()}@example.com` }).returning();
    userId = usuario!.id;
    auth.mockResolvedValue({ user: { id: userId } });

    const linhaDeFoto = itemEstimado({
      descricao: "Manga", quantidade: 100,
      calorias: 65, proteinaG: 1, carboidratosG: 15, gordurasG: 0, fibrasG: 2,
      confianca: "alta", modelo: "modelo-x", origemEstimativa: "foto",
    });

    const fd = new FormData();
    fd.set("dia", DIA);
    fd.set("hora", "12:30");
    fd.set("nome", "Almoço");
    // Origem da tela é "texto" (descrição), mas o item já carregava "foto".
    fd.set("origem", "texto");
    fd.set("itens", JSON.stringify([linhaDeFoto] satisfies ItemPrato[]));

    const resultado = await registrarConsumoRealAction(fd);
    expect(resultado).toEqual({ ok: true });

    const diario = await montarDiarioDoDia(userId, { dia: DIA, fuso: FUSO });
    const item = itemDaLinhaDoTempo(diario);
    expect(item.fonte).toBe("Estimativa por foto");
  });
});
