import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { plans, users } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import { montarDiarioDoDia } from "@/domain/diario/repositorio";
import { itemDeAlimento, itemManual } from "../prato";
import {
  alternarFavorito,
  listarFavoritos,
  listarRecorrentes,
  registrarPrato,
  salvarAlimentoProprio,
} from "../repositorio";

const FUSO = "America/Sao_Paulo";
const DIA = "2026-05-20";

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

async function usuarioComPlano() {
  const [u] = await db.insert(users).values({ email: `atalhos-${randomUUID()}@example.com` }).returning();
  await db.insert(plans).values({
    userId: u!.id, perfilVersao: 1, versao: 1, estado: "ativo",
    regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date(),
  });
  return u!.id;
}

describe("registro avulso pelo Prato", () => {
  it("registra o Prato inteiro como um único Consumo Confirmado e desconta os macros", async () => {
    const userId = await usuarioComPlano();
    const itens = [
      itemDeAlimento("arroz-branco-cozido", { quantidade: 150, unidade: "g" }),
      itemDeAlimento("peito-frango-grelhado", { quantidade: 1, unidade: "filé médio" }),
    ];
    const consumo = await registrarPrato(userId, { nome: "Almoço na rua", itens, dia: DIA, fuso: FUSO });

    expect(consumo.origem).toBe("avulso");
    expect(consumo.refeicaoRef).toBeNull();
    expect(consumo.itens).toHaveLength(2);

    const diario = await montarDiarioDoDia(userId, { dia: DIA, fuso: FUSO });
    const avulsos = diario.linhaDoTempo.filter((i) => i.tipo === "consumo");
    expect(avulsos).toHaveLength(1);
    expect(diario.painel.consumido.calorias).toBe(consumo.macros.calorias);
    expect(diario.painel.restante.calorias).toBe(2400 - consumo.macros.calorias);
    // Registro avulso não consome uma Entrada Planejada.
    expect(diario.linhaDoTempo.filter((i) => i.tipo === "planejada")).toHaveLength(4);
  });

  it("dois registros avulsos no mesmo dia coexistem sem sobrescrever um ao outro", async () => {
    const userId = await usuarioComPlano();
    await registrarPrato(userId, { nome: "Café", itens: [itemDeAlimento("pao-frances", { quantidade: 1, unidade: "unidade" })], dia: DIA, fuso: FUSO });
    await registrarPrato(userId, { nome: "Lanche", itens: [itemDeAlimento("banana-prata", { quantidade: 1, unidade: "unidade média" })], dia: DIA, fuso: FUSO });
    const diario = await montarDiarioDoDia(userId, { dia: DIA, fuso: FUSO });
    expect(diario.linhaDoTempo.filter((i) => i.tipo === "consumo")).toHaveLength(2);
  });

  it("Prato vazio é recusado: não existe refeição sem itens", async () => {
    const userId = await usuarioComPlano();
    await expect(
      registrarPrato(userId, { nome: "Nada", itens: [], dia: DIA, fuso: FUSO }),
    ).rejects.toThrow(/ao menos um item/i);
  });

  it("a proveniência de cada item sobrevive à ida ao banco", async () => {
    const userId = await usuarioComPlano();
    await registrarPrato(userId, {
      nome: "Jantar", dia: DIA, fuso: FUSO,
      itens: [
        itemDeAlimento("ovo-de-galinha-cozido", { quantidade: 2, unidade: "unidade" }),
        itemManual({ nome: "Sobremesa da vó", quantidade: 1, unidade: "porção", calorias: 320, proteinaG: 6, carboidratosG: 45, gordurasG: 12, fibrasG: 1 }),
      ],
    });
    const diario = await montarDiarioDoDia(userId, { dia: DIA, fuso: FUSO });
    const consumo = diario.linhaDoTempo.find((i) => i.tipo === "consumo");
    if (consumo?.tipo !== "consumo") throw new Error("Consumo ausente.");
    const itens = consumo.consumo.itens as { fonte?: string; origemDado?: string; confianca?: string }[];
    expect(itens[0]!.fonte).toMatch(/TBCA/);
    expect(itens[0]!.origemDado).toBe("base");
    expect(itens[1]!.origemDado).toBe("usuario");
    expect(itens[1]!.confianca).toBe("baixa");
  });
});

describe("favoritos, alimentos próprios e recorrentes", () => {
  it("favoritar e desfavoritar alterna sem duplicar a linha", async () => {
    const userId = await usuarioComPlano();
    await alternarFavorito(userId, "banana-prata");
    await alternarFavorito(userId, "banana-prata");
    await alternarFavorito(userId, "banana-prata");
    const favoritos = await listarFavoritos(userId);
    expect(favoritos.map((f) => f.alimentoId)).toEqual(["banana-prata"]);
  });

  it("desfavoritar remove da lista", async () => {
    const userId = await usuarioComPlano();
    await alternarFavorito(userId, "banana-prata");
    await alternarFavorito(userId, "banana-prata");
    expect(await listarFavoritos(userId)).toEqual([]);
  });

  it("alimento próprio salvo fica reutilizável e é marcado como entrada do usuário", async () => {
    const userId = await usuarioComPlano();
    await salvarAlimentoProprio(userId, {
      nome: "Marmita da firma",
      por100g: { calorias: 140, proteinaG: 9, carboidratosG: 15, gordurasG: 5, fibrasG: 2 },
      porcoes: [{ unidade: "marmita", gramas: 500 }],
    });
    const favoritos = await listarFavoritos(userId);
    expect(favoritos.map((f) => f.nome)).toContain("Marmita da firma");
    expect(favoritos.find((f) => f.nome === "Marmita da firma")?.alimentoId).toBeNull();
  });

  it("recorrentes derivam do histórico real, os mais frequentes primeiro", async () => {
    const userId = await usuarioComPlano();
    const cafe = () => itemDeAlimento("pao-frances", { quantidade: 1, unidade: "unidade" });
    const banana = () => itemDeAlimento("banana-prata", { quantidade: 1, unidade: "unidade média" });
    await registrarPrato(userId, { nome: "A", itens: [cafe()], dia: "2026-05-18", fuso: FUSO });
    await registrarPrato(userId, { nome: "B", itens: [cafe()], dia: "2026-05-19", fuso: FUSO });
    await registrarPrato(userId, { nome: "C", itens: [banana()], dia: DIA, fuso: FUSO });

    const recorrentes = await listarRecorrentes(userId);
    expect(recorrentes[0]!.alimentoId).toBe("pao-frances");
    expect(recorrentes[0]!.vezes).toBe(2);
    expect(recorrentes.map((r) => r.alimentoId)).toContain("banana-prata");
  });

  it("sem histórico, recorrentes é lista vazia em vez de sugestão inventada", async () => {
    const userId = await usuarioComPlano();
    expect(await listarRecorrentes(userId)).toEqual([]);
  });
});
