import { describe, expect, it } from "vitest";
import {
  CRITERIOS_FONTE,
  escolherValor,
  pontuarFonte,
  type ValorDeFonte,
} from "../proveniencia";

/**
 * Fontes conflitantes são ponderadas por credencial, método,
 * reprodutibilidade, atualidade, adequação contextual e concordância.
 * Divergência material não some numa média arbitrária.
 */

const tabelaOficial: ValorDeFonte = {
  fonte: "TBCA",
  tipo: "tabela-oficial",
  versao: "7.2",
  atualizadaEm: "2023-01-01",
  metodoAnalitico: true,
  reprodutivel: true,
  contextoLocal: true,
  valor: 165,
};

const rotulo: ValorDeFonte = {
  fonte: "Rótulo do fabricante",
  tipo: "rotulo",
  versao: "2024",
  atualizadaEm: "2024-06-01",
  metodoAnalitico: true,
  reprodutivel: false,
  contextoLocal: true,
  valor: 170,
};

const colaborativa: ValorDeFonte = {
  fonte: "Base colaborativa",
  tipo: "colaborativa",
  versao: "s/v",
  atualizadaEm: "2024-09-01",
  metodoAnalitico: false,
  reprodutivel: false,
  contextoLocal: false,
  valor: 240,
};

describe("pontuação de fonte nutricional", () => {
  it("declara os seis critérios de ponderação", () => {
    expect(CRITERIOS_FONTE.map((c) => c.id)).toEqual([
      "credencial",
      "metodo",
      "reprodutibilidade",
      "atualidade",
      "adequacao-contextual",
      "concordancia",
    ]);
  });

  it("tabela oficial supera rótulo, que supera base colaborativa", () => {
    const hoje = new Date("2024-10-01");
    const oficial = pontuarFonte(tabelaOficial, { hoje, valores: [] });
    const marca = pontuarFonte(rotulo, { hoje, valores: [] });
    const aberta = pontuarFonte(colaborativa, { hoje, valores: [] });
    expect(oficial).toBeGreaterThan(marca);
    expect(marca).toBeGreaterThan(aberta);
  });

  it("concordância com as demais fontes eleva a pontuação do valor central", () => {
    const hoje = new Date("2024-10-01");
    const valores = [tabelaOficial, rotulo, colaborativa];
    // 165 e 170 concordam entre si; 240 é o dissidente.
    const central = pontuarFonte(rotulo, { hoje, valores });
    const isolado = pontuarFonte(rotulo, { hoje, valores: [rotulo, colaborativa] });
    expect(central).toBeGreaterThan(isolado);
  });

  it("fonte desatualizada perde para a mesma fonte recente", () => {
    const hoje = new Date("2024-10-01");
    const antiga = { ...tabelaOficial, atualizadaEm: "2005-01-01" };
    expect(pontuarFonte(tabelaOficial, { hoje, valores: [] })).toBeGreaterThan(
      pontuarFonte(antiga, { hoje, valores: [] }),
    );
  });
});

describe("escolha entre fontes conflitantes", () => {
  const hoje = new Date("2024-10-01");

  it("elege a fonte mais defensável e preserva as descartadas", () => {
    const escolha = escolherValor([colaborativa, tabelaOficial, rotulo], { hoje });
    expect(escolha.escolhida.fonte).toBe("TBCA");
    expect(escolha.valor).toBe(165);
    // A divergência continua auditável: nada é descartado em silêncio.
    expect(escolha.descartadas.map((d) => d.fonte)).toEqual(
      expect.arrayContaining(["Rótulo do fabricante", "Base colaborativa"]),
    );
  });

  it("marca divergência material quando as fontes discordam além da tolerância", () => {
    const escolha = escolherValor([tabelaOficial, colaborativa], { hoje });
    expect(escolha.divergenciaMaterial).toBe(true);
    // Sem média arbitrária: o valor exibido é o de uma fonte real.
    expect([165, 240]).toContain(escolha.valor);
  });

  it("não marca divergência quando as fontes concordam dentro da tolerância", () => {
    const escolha = escolherValor([tabelaOficial, rotulo], { hoje });
    expect(escolha.divergenciaMaterial).toBe(false);
  });

  it("fonte única é usada sem alegar consenso inexistente", () => {
    const escolha = escolherValor([colaborativa], { hoje });
    expect(escolha.valor).toBe(240);
    expect(escolha.divergenciaMaterial).toBe(false);
    expect(escolha.descartadas).toEqual([]);
  });

  it("lista vazia é erro de programação, não um valor silencioso", () => {
    expect(() => escolherValor([], { hoje })).toThrow(/ao menos uma fonte/i);
  });
});

/**
 * Tabela de decisão exigida pelo critério de aceite da issue #23
 * ("Fontes conflitantes: escolha ponderada testada com tabela de
 * decisão"). Cada linha fixa uma combinação de fontes e o vencedor
 * esperado, de modo que mudar um peso quebre o caso exato afetado em
 * vez de um teste genérico.
 */
describe("tabela de decisão entre fontes", () => {
  const hoje = new Date("2024-10-01");

  const CASOS: ReadonlyArray<{
    cenario: string;
    fontes: ValorDeFonte[];
    vencedora: string;
    divergente: boolean;
  }> = [
    {
      cenario: "oficial recente vs colaborativa recente",
      fontes: [tabelaOficial, colaborativa],
      vencedora: "TBCA",
      divergente: true,
    },
    {
      cenario: "oficial antiga vs rótulo atual, valores próximos",
      fontes: [{ ...tabelaOficial, atualizadaEm: "2001-01-01" }, rotulo],
      vencedora: "TBCA",
      divergente: false,
    },
    {
      cenario: "rótulo vs colaborativa, sem tabela oficial",
      fontes: [rotulo, colaborativa],
      vencedora: "Rótulo do fabricante",
      divergente: true,
    },
    {
      cenario: "três fontes, duas concordantes contra uma isolada",
      fontes: [tabelaOficial, rotulo, colaborativa],
      vencedora: "TBCA",
      divergente: true,
    },
    {
      cenario: "estimativa de IA nunca vence uma tabela analítica",
      fontes: [
        tabelaOficial,
        { ...colaborativa, tipo: "estimativa-ia", fonte: "Estimativa da IA", valor: 168 },
      ],
      vencedora: "TBCA",
      divergente: false,
    },
    {
      cenario: "entrada do usuário perde para rótulo do fabricante",
      fontes: [
        rotulo,
        { ...rotulo, tipo: "usuario", fonte: "Informado por você", metodoAnalitico: false, valor: 172 },
      ],
      vencedora: "Rótulo do fabricante",
      divergente: false,
    },
  ];

  for (const caso of CASOS) {
    it(caso.cenario, () => {
      const escolha = escolherValor(caso.fontes, { hoje });
      expect(escolha.escolhida.fonte).toBe(caso.vencedora);
      expect(escolha.divergenciaMaterial).toBe(caso.divergente);
      // O valor exibido é sempre o de uma fonte real, nunca uma média.
      expect(caso.fontes.map((f) => f.valor)).toContain(escolha.valor);
    });
  }
});
