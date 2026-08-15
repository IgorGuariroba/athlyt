import { describe, expect, it } from "vitest";
import type { MetaNutricional } from "@/domain/plano/tipos";
import { entradasPlanejadas, metaDoDia, somarMacros, subtrairMacros } from "../cardapio";

const nutricao: MetaNutricional = {
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
};

describe("Cardápio Diário como Entradas Planejadas", () => {
  it("materializa uma entrada por refeição, com ref estável e horário", () => {
    const entradas = entradasPlanejadas(nutricao);
    expect(entradas.map((e) => e.nome)).toEqual(["Café da manhã", "Almoço", "Jantar", "Lanche"]);
    expect(new Set(entradas.map((e) => e.refeicaoRef)).size).toBe(4);
    expect(entradas[0].horaLocal).toBe("08:00");
    expect(entradas[1].horaLocal).toBe("12:30");
  });

  it("macros da entrada são a soma dos itens, para o detalhamento fechar com o cartão", () => {
    for (const entrada of entradasPlanejadas(nutricao)) {
      expect(entrada.macros).toEqual(somarMacros(entrada.itens));
    }
  });

  it("soma das entradas aproxima a meta do dia sem ultrapassá-la materialmente", () => {
    const total = somarMacros(entradasPlanejadas(nutricao).map((e) => e.macros));
    const meta = metaDoDia(nutricao);
    expect(Math.abs(total.calorias - meta.calorias)).toBeLessThanOrEqual(meta.calorias * 0.02);
    expect(Math.abs(total.proteinaG - meta.proteinaG)).toBeLessThanOrEqual(4);
  });

  it("restante é meta menos consumido e pode ficar negativo sem punição", () => {
    const meta = metaDoDia(nutricao);
    const excesso = { ...meta, calorias: meta.calorias + 300 };
    expect(subtrairMacros(meta, excesso).calorias).toBe(-300);
  });

  it("cardápio sem refeições não produz entradas planejadas", () => {
    expect(entradasPlanejadas({ ...nutricao, refeicoes: [] })).toEqual([]);
  });

  it("leva a explicação do agent junto da refeição materializada", () => {
    // Sem isso o Diário mostra a prescrição sem o motivo, e a pergunta
    // "por que estou comendo isso?" fica sem resposta na tela em que
    // ela nasce — embora a explicação exista no Plano Ativo.
    const explicacao = {
      porque: "Montei com itens de preparo rápido pelos seus 15 minutos pela manhã.",
      dadosUsados: [{ campo: "tempoPreparoMin", valor: "15 min" }],
    };
    const [entrada] = entradasPlanejadas({
      ...nutricao,
      refeicoes: [{ ...nutricao.refeicoes[0], explicacao }],
    });

    expect(entrada.explicacao).toEqual(explicacao);
  });

  it("refeição de plano anterior, sem explicação, materializa sem inventá-la", () => {
    // Plano Ativo é imutável: planos gravados antes da explicação
    // continuam válidos e a entrada precisa admitir a lacuna.
    const [entrada] = entradasPlanejadas(nutricao);

    expect(entrada.explicacao).toBeUndefined();
  });
});
