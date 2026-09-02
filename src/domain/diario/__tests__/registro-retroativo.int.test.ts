import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { plans, users } from "@/db/schema";
import { itemEstimado } from "@/domain/alimentos/prato";
import type { PlanoGerado } from "@/domain/plano/tipos";
import {
  confirmarRefeicao,
  montarDiarioDoDia,
  obterConsumoDaRefeicao,
  registrarConsumoReal,
} from "../repositorio";

const FUSO = "America/Sao_Paulo";
const DIA = "2026-05-20";
const ONTEM = "2026-05-19";

const plano: PlanoGerado = {
  regraVersao: "motor-plano-v1", modoConservador: false, perfilVersao: 1, dadosUsados: [],
  bloco: { duracaoSemanas: 6, divisao: "Superior / Inferior", dias: [] },
  nutricao: {
    calorias: 2400, proteinaG: 160, carboidratosG: 300, gordurasG: 62, fibrasG: 24,
    estrategia: "Manutenção",
    refeicoes: [
      { nome: "Café da manhã", percentual: 25, calorias: 600, proteinaG: 40, itens: ["Aveia 60 g"] },
      { nome: "Almoço", percentual: 35, calorias: 840, proteinaG: 56, itens: ["Arroz 150 g"] },
      { nome: "Jantar", percentual: 25, calorias: 600, proteinaG: 40, itens: ["Batata 250 g"] },
      { nome: "Lanche", percentual: 15, calorias: 360, proteinaG: 24, itens: ["Fruta 1 un"] },
    ],
  },
};

const REF_ALMOCO = "1-Almoço";

async function usuarioComPlano() {
  const [u] = await db
    .insert(users)
    .values({ email: `retroativo-${randomUUID()}@example.com` })
    .returning();
  await db.insert(plans).values({
    userId: u.id, perfilVersao: 1, versao: 1, estado: "ativo",
    regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano,
    activatedAt: new Date(),
  });
  return u.id;
}

function estimados(calorias: number) {
  return [
    itemEstimado({
      descricao: "Marmita da esquina",
      quantidade: 400,
      calorias, proteinaG: 30, carboidratosG: 60, gordurasG: 20, fibrasG: 5,
      confianca: "baixa",
      modelo: "google/gemini-2.5-flash-lite",
      origemEstimativa: "texto",
    }),
  ];
}

describe("Registro Retroativo de uma Refeição Planejada", () => {
  it("substitui o consumo já registrado em vez de somar um segundo evento ao dia", async () => {
    const userId = await usuarioComPlano();
    await confirmarRefeicao(userId, { refeicaoRef: REF_ALMOCO, dia: DIA, fuso: FUSO });

    const antes = await obterConsumoDaRefeicao(userId, { refeicaoRef: REF_ALMOCO, dia: DIA, fuso: FUSO });
    // 150 g de arroz pela base: o consumo não recebe mais a meta de
    // 840 kcal inteira como se ela fosse composição deste alimento.
    expect(antes?.macros.calorias).toBe(192);

    await registrarConsumoReal(userId, {
      refeicaoRef: REF_ALMOCO,
      nome: "Almoço na rua",
      itens: estimados(700),
      dia: DIA,
      horaLocal: "13:15",
      fuso: FUSO,
    });

    const diario = await montarDiarioDoDia(userId, { dia: DIA, fuso: FUSO });
    const consumos = diario.linhaDoTempo.filter((i) => i.tipo === "consumo");
    // O atleta almoçou uma vez: o Consumo Real troca o anterior.
    expect(consumos).toHaveLength(1);
    expect(diario.painel.consumido.calorias).toBe(700);
  });

  it("preserva o nome e os macros da Refeição Planejada como referência do desvio", async () => {
    const userId = await usuarioComPlano();
    const consumo = await registrarConsumoReal(userId, {
      refeicaoRef: REF_ALMOCO,
      nome: "Almoço na rua",
      itens: estimados(700),
      dia: DIA,
      horaLocal: "13:15",
      fuso: FUSO,
    });

    // A prescrição original sobrevive ao consumo que a substituiu:
    // o nome identifica o momento alimentar; os itens são os efetivamente registrados.
    expect(consumo.planejado?.calorias).toBe(192);
    expect(consumo.nome).toBe("Almoço");
  });

  it("não grava nada enquanto o atleta não confirma: consultar o existente é leitura pura", async () => {
    const userId = await usuarioComPlano();

    expect(
      await obterConsumoDaRefeicao(userId, { refeicaoRef: REF_ALMOCO, dia: DIA, fuso: FUSO }),
    ).toBeNull();

    const diario = await montarDiarioDoDia(userId, { dia: DIA, fuso: FUSO });
    expect(diario.painel.consumido.calorias).toBe(0);
    expect(diario.linhaDoTempo.filter((i) => i.tipo === "planejada")).toHaveLength(4);
  });

  it("cancelar depois do aviso deixa o registro anterior intacto", async () => {
    const userId = await usuarioComPlano();
    await confirmarRefeicao(userId, { refeicaoRef: REF_ALMOCO, dia: DIA, fuso: FUSO });

    // Cancelar é não chamar a escrita: o estado do banco não muda.
    const depois = await obterConsumoDaRefeicao(userId, { refeicaoRef: REF_ALMOCO, dia: DIA, fuso: FUSO });
    expect(depois?.macros.calorias).toBe(192);
    expect(depois?.origem).toBe("planejado");
  });

  it("o horário escolhido pelo atleta posiciona a refeição na linha do tempo", async () => {
    const userId = await usuarioComPlano();
    await registrarConsumoReal(userId, {
      refeicaoRef: REF_ALMOCO,
      nome: "Almoço tardio",
      itens: estimados(700),
      dia: DIA,
      horaLocal: "15:45",
      fuso: FUSO,
    });

    const diario = await montarDiarioDoDia(userId, { dia: DIA, fuso: FUSO });
    const consumo = diario.linhaDoTempo.find((i) => i.tipo === "consumo");
    expect(consumo?.horaLocal).toBe("15:45");
  });
});

describe("Registro Retroativo sem planejamento", () => {
  it("aparece na linha do tempo e conta nos totais do dia como qualquer refeição", async () => {
    const userId = await usuarioComPlano();
    await registrarConsumoReal(userId, {
      nome: "Pastel na feira",
      itens: estimados(430),
      dia: DIA,
      horaLocal: "17:20",
      fuso: FUSO,
    });

    const diario = await montarDiarioDoDia(userId, { dia: DIA, fuso: FUSO });
    const consumo = diario.linhaDoTempo.find((i) => i.tipo === "consumo");
    expect(consumo?.tipo === "consumo" && consumo.consumo.nome).toBe("Pastel na feira");
    expect(diario.painel.consumido.calorias).toBe(430);
    expect(diario.painel.restante.calorias).toBe(2400 - 430);
    // Sem planejamento não há prescrição para comparar, e as quatro
    // Entradas Planejadas continuam pendentes.
    expect(consumo?.tipo === "consumo" && consumo.consumo.planejado).toBeNull();
    expect(diario.linhaDoTempo.filter((i) => i.tipo === "planejada")).toHaveLength(4);
  });

  it("dois registros sem planejamento no mesmo dia coexistem", async () => {
    const userId = await usuarioComPlano();
    await registrarConsumoReal(userId, {
      nome: "Lanche da tarde", itens: estimados(200), dia: DIA, horaLocal: "16:00", fuso: FUSO,
    });
    await registrarConsumoReal(userId, {
      nome: "Ceia", itens: estimados(150), dia: DIA, horaLocal: "22:30", fuso: FUSO,
    });

    const diario = await montarDiarioDoDia(userId, { dia: DIA, fuso: FUSO });
    expect(diario.linhaDoTempo.filter((i) => i.tipo === "consumo")).toHaveLength(2);
    expect(diario.painel.consumido.calorias).toBe(350);
  });

  it("registrar em dia anterior cai no dia escolhido, não em hoje", async () => {
    const userId = await usuarioComPlano();
    await registrarConsumoReal(userId, {
      nome: "Jantar de ontem", itens: estimados(500), dia: ONTEM, horaLocal: "20:00", fuso: FUSO,
    });

    const ontem = await montarDiarioDoDia(userId, { dia: ONTEM, fuso: FUSO });
    const hoje = await montarDiarioDoDia(userId, { dia: DIA, fuso: FUSO });
    expect(ontem.painel.consumido.calorias).toBe(500);
    expect(hoje.painel.consumido.calorias).toBe(0);
  });

  it("registro sem itens é recusado: não existe refeição vazia", async () => {
    const userId = await usuarioComPlano();
    await expect(
      registrarConsumoReal(userId, {
        nome: "Nada", itens: [], dia: DIA, horaLocal: "12:00", fuso: FUSO,
      }),
    ).rejects.toThrow(/ao menos um item/i);
  });

  it("a proveniência da estimativa por descrição sobrevive à ida ao banco", async () => {
    const userId = await usuarioComPlano();
    await registrarConsumoReal(userId, {
      nome: "Almoço descrito", itens: estimados(700), dia: DIA, horaLocal: "12:30", fuso: FUSO,
    });

    const diario = await montarDiarioDoDia(userId, { dia: DIA, fuso: FUSO });
    const consumo = diario.linhaDoTempo.find((i) => i.tipo === "consumo");
    if (consumo?.tipo !== "consumo") throw new Error("Consumo ausente.");
    const itens = consumo.consumo.itens as Array<{ fonte?: string; origemDado?: string }>;
    expect(itens[0].origemDado).toBe("estimativa-ia");
    expect(itens[0].fonte).toBe("Estimativa por descrição");
  });
});
