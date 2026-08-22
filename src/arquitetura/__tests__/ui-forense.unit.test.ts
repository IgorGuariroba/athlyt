import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  avaliarAlvoDeToque,
  avaliarFoco,
  avaliarOclusao,
  avaliarOverflow,
} from "../../../.pi/extensions/ui-forense/checagens";
import { numerarInventario } from "../../../.pi/extensions/ui-forense/inventario";
import { avaliarTokens, lerEscalaDeTokens } from "../../../.pi/extensions/ui-forense/tokens";
import { verificarHipotese } from "../../../.pi/extensions/ui-forense/verificacao";
import type { NoColetado } from "../../../.pi/extensions/ui-forense/tipos";

function no(parcial: Partial<NoColetado> & { seletor: string }): NoColetado {
  return {
    papel: "generic",
    nome: "",
    tag: "div",
    caixa: { x: 0, y: 0, largura: 100, altura: 20 },
    estilo: {},
    visivel: true,
    ...parcial,
  };
}

describe("inventário de elementos", () => {
  it("numera em ordem de leitura, não na ordem em que o DOM foi percorrido", () => {
    const inventario = numerarInventario([
      no({ seletor: "footer button", caixa: { x: 24, y: 720, largura: 342, altura: 52 } }),
      no({ seletor: "header h1", caixa: { x: 24, y: 60, largura: 200, altura: 32 } }),
      no({ seletor: "form input", caixa: { x: 24, y: 300, largura: 342, altura: 48 } }),
    ]);

    expect(inventario.map((item) => [item.id, item.seletor])).toEqual([
      ["e1", "header h1"],
      ["e2", "form input"],
      ["e3", "footer button"],
    ]);
  });
});

describe("alvo de toque", () => {
  // DESIGN.md > Acessibilidade: "Touch target mínimo 44×44px".
  it("acusa o controle cuja área clicável é menor que 44×44", () => {
    const resultado = avaliarAlvoDeToque(
      no({ seletor: "button.fechar", caixa: { x: 340, y: 24, largura: 31, altura: 31 } }),
    );

    expect(resultado).toEqual({
      conforme: false,
      largura: 31,
      altura: 31,
      minimo: 44,
    });
  });

  it("absolve o ícone pequeno cuja área clicável do ancestral já cobre 44×44", () => {
    const resultado = avaliarAlvoDeToque(
      no({ seletor: "button.fechar svg", caixa: { x: 352, y: 36, largura: 24, altura: 24 } }),
      { caixa: { x: 340, y: 24, largura: 48, altura: 48 } },
    );

    expect(resultado).toEqual({
      conforme: true,
      largura: 48,
      altura: 48,
      minimo: 44,
      alvoHerdado: true,
    });
  });
});

describe("desvio de tokens", () => {
  const escala = lerEscalaDeTokens(readFileSync("src/app/globals.css", "utf8"));

  it("extrai a escala tipográfica declarada em globals.css", () => {
    // Literais de DESIGN.md > Typography > Hierarquia.
    expect(escala.fontSize).toEqual(
      expect.arrayContaining([
        { token: "--text-body-md", valor: 14 },
        { token: "--text-title", valor: 18 },
        { token: "--text-display", valor: 40 },
      ]),
    );
  });

  it("acusa tamanho de fonte fora da escala e aponta o token mais próximo", () => {
    const violacoes = avaliarTokens(
      no({ seletor: "p.preco", estilo: { fontSize: "15px" } }),
      escala,
    );

    expect(violacoes).toEqual([
      {
        propriedade: "font-size",
        computado: 15,
        tokenMaisProximo: "--text-body-lg",
        esperado: 16,
      },
    ]);
  });

  it("mantém line-height fora da escala de tamanhos", () => {
    // `--text-display--line-height: 44px` é modificador do token, não
    // um tamanho: aceitá-lo faria 44px passar como font-size válido.
    expect(escala.fontSize.map((item) => item.token)).not.toContain(
      "--text-display--line-height",
    );
    expect(
      avaliarTokens(no({ seletor: "h1", estilo: { fontSize: "44px" } }), escala),
    ).toEqual([
      {
        propriedade: "font-size",
        computado: 44,
        tokenMaisProximo: "--text-display",
        esperado: 40,
      },
    ]);
  });

  it("não acusa valor que casa exatamente com um token", () => {
    expect(
      avaliarTokens(no({ seletor: "p.rotulo", estilo: { fontSize: "12px" } }), escala),
    ).toEqual([]);
  });
});

describe("transbordo horizontal", () => {
  const viewport = { largura: 390, altura: 844 };

  it("mede quantos pixels o elemento passa da borda direita", () => {
    expect(
      avaliarOverflow(
        no({ seletor: "table.macros", caixa: { x: 24, y: 400, largura: 413, altura: 200 } }),
        viewport,
      ),
    ).toEqual({ transborda: true, lado: "direita", excedente: 47 });
  });

  it("ignora o que rola na vertical, que é leitura normal em mobile", () => {
    expect(
      avaliarOverflow(
        no({ seletor: "main", caixa: { x: 0, y: 0, largura: 390, altura: 2400 } }),
        viewport,
      ),
    ).toEqual({ transborda: false });
  });
});

describe("oclusão", () => {
  it("acusa quando o hit-test do centro atinge outro elemento", () => {
    // Padrão recorrente em mobile: rodapé fixo sobre o CTA da página.
    const resultado = avaliarOclusao({
      esperado: "button#finalizar",
      amostras: [
        { ponto: [195, 760], atingido: "nav.rodape-fixo" },
        { ponto: [30, 745], atingido: "button#finalizar" },
      ],
    });

    expect(resultado).toEqual({
      obstruido: true,
      obstrutores: ["nav.rodape-fixo"],
      pontosLivres: 1,
      pontosAmostrados: 2,
    });
  });

  it("aceita o filho do próprio elemento como alvo atingido", () => {
    // Clicar num botão costuma atingir o `span` interno; tratar isso
    // como obstrução encheria a varredura de falso positivo.
    expect(
      avaliarOclusao({
        esperado: "button#salvar",
        amostras: [{ ponto: [195, 400], atingido: "button#salvar > span" }],
      }),
    ).toEqual({
      obstruido: false,
      obstrutores: [],
      pontosLivres: 1,
      pontosAmostrados: 1,
    });
  });
});

describe("verificação de hipótese", () => {
  it("rejeita 'alvo de toque pequeno' quando a área clicável real cobre o mínimo", () => {
    const veredito = verificarHipotese({
      criterio: "alvo-de-toque",
      elemento: no({
        seletor: "button.fechar svg",
        caixa: { x: 352, y: 36, largura: 24, altura: 24 },
      }),
      ancestralClicavel: { caixa: { x: 340, y: 24, largura: 48, altura: 48 } },
    });

    expect(veredito.status).toBe("rejeitada");
    expect(veredito.evidencia).toEqual({
      conforme: true,
      largura: 48,
      altura: 48,
      minimo: 44,
      alvoHerdado: true,
    });
    expect(veredito.motivo).toContain("48×48");
  });

  it("confirma 'alvo de toque pequeno' quando nada amplia a área", () => {
    const veredito = verificarHipotese({
      criterio: "alvo-de-toque",
      elemento: no({
        seletor: "button.fechar",
        caixa: { x: 340, y: 24, largura: 31, altura: 31 },
      }),
    });

    expect(veredito.status).toBe("confirmada");
    expect(veredito.regra).toBe(">= 44×44");
  });

  it("devolve 'indeterminada' quando falta a evidência que o critério exige", () => {
    // Sem amostras de hit-test não há como decidir; inventar um veredito
    // aqui é o mesmo defeito que a ferramenta existe para corrigir.
    const veredito = verificarHipotese({
      criterio: "oclusao",
      elemento: no({ seletor: "button#finalizar" }),
    });

    expect(veredito.status).toBe("indeterminada");
    expect(veredito.motivo).toContain("hit-test");
  });
});

describe("foco visível", () => {
  it("acusa controlável por teclado que não muda de aparência ao focar", () => {
    expect(
      avaliarFoco({
        focavel: true,
        antes: { outlineStyle: "none", outlineWidth: "0px", boxShadow: "none" },
        depois: { outlineStyle: "none", outlineWidth: "0px", boxShadow: "none" },
      }),
    ).toEqual({ focavel: true, focoVisivel: false });
  });

  it("aceita anel de foco desenhado por box-shadow", () => {
    // O `ring` do Tailwind é box-shadow: exigir `outline` reprovaria
    // todo componente do kit.
    expect(
      avaliarFoco({
        focavel: true,
        antes: { outlineStyle: "none", outlineWidth: "0px", boxShadow: "none" },
        depois: {
          outlineStyle: "none",
          outlineWidth: "0px",
          boxShadow: "rgb(86, 86, 86) 0px 0px 0px 3px",
        },
      }),
    ).toEqual({ focavel: true, focoVisivel: true });
  });
});
