import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { plans, users } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import {
  confirmarRefeicao,
  desfazerConfirmacao,
  montarDiarioDoDia,
  obterEntradaPlanejada,
} from "../repositorio";

const FUSO = "America/Sao_Paulo";

const plano: PlanoGerado = {
  regraVersao: "motor-plano-v1",
  modoConservador: false,
  perfilVersao: 1,
  dadosUsados: [],
  bloco: { duracaoSemanas: 6, divisao: "Superior / Inferior", dias: [] },
  nutricao: {
    calorias: 2400,
    proteinaG: 160,
    carboidratosG: 300,
    gordurasG: 62,
    fibrasG: 24,
    estrategia: "Manutenção",
    refeicoes: [
      { nome: "Café da manhã", percentual: 25, calorias: 600, proteinaG: 40, itens: ["Aveia 60 g", "Ovos 2 un"] },
      { nome: "Almoço", percentual: 35, calorias: 840, proteinaG: 56, itens: ["Arroz 150 g", "Frango 150 g"] },
      { nome: "Jantar", percentual: 25, calorias: 600, proteinaG: 40, itens: ["Batata 250 g"] },
      { nome: "Lanche", percentual: 15, calorias: 360, proteinaG: 24, itens: ["Fruta 1 un"] },
    ],
  },
};

async function usuarioComPlano() {
  const [u] = await db.insert(users).values({ email: `diario-${randomUUID()}@example.com` }).returning();
  await db.insert(plans).values({
    userId: u.id, perfilVersao: 1, versao: 1, estado: "ativo",
    regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date(),
  });
  return u.id;
}

describe("jornada do Diário: prescrição → confirmação → macros restantes", () => {
  it("linha do tempo nasce com as Entradas Planejadas do Cardápio Diário", async () => {
    const userId = await usuarioComPlano();
    const diario = await montarDiarioDoDia(userId, { dia: "2026-04-10", fuso: FUSO });
    const planejadas = diario.linhaDoTempo.filter((i) => i.tipo === "planejada");
    expect(planejadas).toHaveLength(4);
    expect(diario.painel.meta.calorias).toBe(2400);
    expect(diario.painel.consumido.calorias).toBe(0);
    expect(diario.painel.restante).toEqual(diario.painel.meta);
  });

  it("confirmar em 1 toque cria Consumo Confirmado e desconta os macros restantes", async () => {
    const userId = await usuarioComPlano();
    const almoco = (await montarDiarioDoDia(userId, { dia: "2026-04-10", fuso: FUSO }))
      .linhaDoTempo.find((i) => i.tipo === "planejada" && i.entrada.nome === "Almoço");
    if (almoco?.tipo !== "planejada") throw new Error("Almoço planejado ausente.");

    const consumo = await confirmarRefeicao(userId, { refeicaoRef: almoco.entrada.refeicaoRef, dia: "2026-04-10", fuso: FUSO });
    expect(consumo.origem).toBe("planejado");
    expect(consumo.macros).toEqual(almoco.entrada.macros);

    const diario = await montarDiarioDoDia(userId, { dia: "2026-04-10", fuso: FUSO });
    // A refeição sai do estado planejado e entra como consumo — nunca as duas.
    expect(diario.linhaDoTempo.filter((i) => i.tipo === "planejada")).toHaveLength(3);
    expect(diario.linhaDoTempo.filter((i) => i.tipo === "consumo")).toHaveLength(1);
    expect(diario.painel.consumido.calorias).toBe(almoco.entrada.macros.calorias);
    expect(diario.painel.restante.calorias).toBe(2400 - almoco.entrada.macros.calorias);
    expect(diario.painel.restante.proteinaG).toBe(160 - almoco.entrada.macros.proteinaG);
  });

  it("editar antes de confirmar registra o consumo real, distinto do planejado", async () => {
    const userId = await usuarioComPlano();
    const planejada = (await obterEntradaPlanejada(userId, "1-Almoço"))!;
    const semArroz = planejada.itens.filter((item) => !item.descricao.startsWith("Arroz"));

    const consumo = await confirmarRefeicao(userId, { refeicaoRef: planejada.refeicaoRef, itens: semArroz, dia: "2026-04-10", fuso: FUSO });
    expect(consumo.origem).toBe("editado");
    expect(consumo.itens).toHaveLength(1);
    expect(consumo.planejado).toEqual(planejada.macros);
    expect(consumo.macros.calorias).toBeLessThan(planejada.macros.calorias);

    const diario = await montarDiarioDoDia(userId, { dia: "2026-04-10", fuso: FUSO });
    expect(diario.painel.consumido.calorias).toBe(consumo.macros.calorias);
    expect(diario.painel.restante.calorias).toBe(2400 - consumo.macros.calorias);
  });

  it("confirmar duas vezes não duplica nem soma o consumo em dobro", async () => {
    const userId = await usuarioComPlano();
    await confirmarRefeicao(userId, { refeicaoRef: "0-Café da manhã", dia: "2026-04-10", fuso: FUSO });
    await confirmarRefeicao(userId, { refeicaoRef: "0-Café da manhã", dia: "2026-04-10", fuso: FUSO });
    const diario = await montarDiarioDoDia(userId, { dia: "2026-04-10", fuso: FUSO });
    expect(diario.linhaDoTempo.filter((i) => i.tipo === "consumo")).toHaveLength(1);
  });

  it("desfazer devolve a refeição ao estado planejado e restaura os macros", async () => {
    const userId = await usuarioComPlano();
    await confirmarRefeicao(userId, { refeicaoRef: "2-Jantar", dia: "2026-04-10", fuso: FUSO });
    await desfazerConfirmacao(userId, { refeicaoRef: "2-Jantar", dia: "2026-04-10", fuso: FUSO });
    const diario = await montarDiarioDoDia(userId, { dia: "2026-04-10", fuso: FUSO });
    expect(diario.linhaDoTempo.filter((i) => i.tipo === "planejada")).toHaveLength(4);
    expect(diario.painel.consumido.calorias).toBe(0);
  });

  it("o dia alimentar segue o fuso do usuário: ceia às 22h fica no dia local", async () => {
    const userId = await usuarioComPlano();
    // 2026-04-11T01:00Z = 2026-04-10 22:00 em São Paulo.
    await confirmarRefeicao(userId, {
      refeicaoRef: "3-Lanche", fuso: FUSO, agora: new Date("2026-04-11T01:00:00.000Z"),
    });
    const local = await montarDiarioDoDia(userId, { dia: "2026-04-10", fuso: FUSO });
    expect(local.linhaDoTempo.filter((i) => i.tipo === "consumo")).toHaveLength(1);
    const emUtc = await montarDiarioDoDia(userId, { dia: "2026-04-10", fuso: "UTC" });
    expect(emUtc.linhaDoTempo.filter((i) => i.tipo === "consumo")).toHaveLength(0);
  });

  it("sem Plano Ativo o Diário abre vazio em vez de falhar", async () => {
    const [u] = await db.insert(users).values({ email: `diario-${randomUUID()}@example.com` }).returning();
    const diario = await montarDiarioDoDia(u.id, { dia: "2026-04-10", fuso: FUSO });
    expect(diario.linhaDoTempo).toEqual([]);
    expect(diario.painel.meta.calorias).toBe(0);
  });
});
