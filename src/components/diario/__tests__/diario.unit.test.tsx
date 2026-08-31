import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AcoesRegistro } from "../acoes-registro";
import {
  CartaoConsumo,
  CartaoRefeicaoPlanejada,
  CartaoSessaoDiario,
} from "../cartoes-diario";
import { LinhaDoTempoDiario } from "../linha-do-tempo";
import { LinhaDoTempoDia } from "../linha-do-tempo-dia";
import { SeletorMetodoRegistro } from "../seletor-metodo-registro";
import { NavegacaoDia } from "../navegacao-dia";
import { PainelMacrosDia } from "../painel-macros-dia";

afterEach(cleanup);

const MACROS = {
  calorias: 556,
  proteinaG: 56,
  carboidratosG: 40,
  gordurasG: 12,
  fibrasG: 6,
};

/**
 * O contrato desta camada é o que a tela do Diário não pode perder ao
 * ser recomposta: prescrição distinguível de consumo, estimativa
 * distinguível de medição e leitura completa dos macros por leitor de
 * tela mesmo com o painel comprimido em siglas.
 */
describe("PainelMacrosDia", () => {
  const painel = {
    meta: { calorias: 2220, proteinaG: 231, carboidratosG: 182, gordurasG: 70, fibrasG: 30 },
    consumido: { calorias: 1589, proteinaG: 57, carboidratosG: 190, gordurasG: 70, fibrasG: 12 },
    restante: { calorias: 631, proteinaG: 174, carboidratosG: -8, gordurasG: 0, fibrasG: 18 },
  };

  it("dá a cada macro um rótulo completo para leitor de tela, além da sigla", () => {
    render(<PainelMacrosDia painel={painel} />);

    expect(
      screen.getByText(/Proteína: 57 de 231 g consumidos, restam 174 g/),
    ).toBeTruthy();
  });

  it("descreve excesso como acima da meta, sem linguagem de alerta", () => {
    render(<PainelMacrosDia painel={painel} />);

    expect(
      screen.getByText(/Carboidratos: 190 de 182 g consumidos, 8 g acima da meta/),
    ).toBeTruthy();
    // O restante fica sob a coluna do próprio macro, sem repetir a sigla.
    expect(screen.getByText("8 g acima")).toBeTruthy();
    expect(screen.getByText("restam 174 g")).toBeTruthy();
  });

  /**
   * O atleta acompanha três macros. Fibras saem da tela mesmo
   * continuando no domínio (`Macros.fibrasG` alimenta outras
   * superfícies): sem esta asserção, bastaria alguem devolver a quinta
   * coluna ao painel para a decisão se perder sem nenhum teste vermelho.
   */
  it("mostra apenas proteína, carboidratos e gorduras — sem fibras", () => {
    render(<PainelMacrosDia painel={painel} />);

    expect(screen.getByText("Proteína")).toBeTruthy();
    expect(screen.getByText("Carboidratos")).toBeTruthy();
    expect(screen.getByText("Gorduras")).toBeTruthy();
    expect(screen.queryByText(/[Ff]ibras/)).toBeNull();
  });

  it("mantém a energia legível, fora da grade dos três macros", () => {
    render(<PainelMacrosDia painel={painel} />);

    expect(screen.getByText(/^1589/)).toBeTruthy();
    expect(screen.getByText("/2220 kcal")).toBeTruthy();
    expect(
      screen.getByText(/Energia: 1589 de 2220 kcal consumidos, restam 631 kcal/),
    ).toBeTruthy();
  });
});

describe("NavegacaoDia", () => {
  it("desabilita o avanço quando não há próximo dia, mantendo a afordância na tela", () => {
    render(
      <NavegacaoDia titulo="Hoje" subtitulo="2026-08-19" hrefAnterior="/diario?dia=2026-08-18" />,
    );

    const proximo = screen.getByRole("button", { name: "Próximo dia" });
    expect(proximo.hasAttribute("disabled")).toBe(true);
    expect(
      screen.getByRole("link", { name: "Dia anterior" }).getAttribute("href"),
    ).toBe("/diario?dia=2026-08-18");
  });
});

describe("AcoesRegistro", () => {
  it("expõe a câmera como caminho padrão e a busca como alvo secundário", () => {
    render(<AcoesRegistro hrefFoto="/diario/registrar/foto" hrefBusca="/diario/registrar" />);

    expect(
      screen.getByRole("link", { name: /Fotografar refeição/ }).getAttribute("href"),
    ).toBe("/diario/registrar/foto");
    expect(
      screen.getByRole("link", { name: "Registrar buscando alimento" }).getAttribute("href"),
    ).toBe("/diario/registrar");
  });
});

describe("CartaoRefeicaoPlanejada", () => {
  it("marca a refeição como planejada e oferece as três saídas diante do prato", () => {
    render(
      <CartaoRefeicaoPlanejada
        nome="Café da manhã"
        macros={MACROS}
        itens={[{ descricao: "4 claras + 2 ovos", calorias: 220, proteinaG: 28, carboidratosG: 2, gordurasG: 11, fibrasG: 0 }]}
        hrefDivergencia="/diario/registrar/descricao"
        hrefAjustar="/diario/refeicao/cafe"
        confirmacao={<button type="submit">Comi como planejado</button>}
      />,
    );

    expect(screen.getByText("Planejada")).toBeTruthy();
    expect(screen.getByText("4 claras + 2 ovos")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Comi como planejado" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Comi outra coisa/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Editar Café da manhã/ })).toBeTruthy();
  });

  it("guarda o motivo da prescrição atrás de uma pergunta, sem ocupar a dobra", () => {
    render(
      <CartaoRefeicaoPlanejada
        nome="Café da manhã"
        macros={MACROS}
        itens={[]}
        explicacao={{ porque: "Concentra proteína no início do dia.", dadosUsados: [] }}
        expandido
        hrefDivergencia="/f"
        hrefAjustar="/a"
        confirmacao={null}
      />,
    );

    expect(screen.getByText("Por que esta refeição?")).toBeTruthy();
  });
});

describe("CartaoConsumo", () => {
  it("distingue estimativa por foto de valor medido", () => {
    render(
      <CartaoConsumo
        nome="Ovos mexidos"
        estimadoPorFoto
        macros={{ calorias: 264, proteinaG: 14, carboidratosG: 19, gordurasG: 15, fibrasG: 3 }}
      />,
    );

    expect(screen.getByText("Estimado por foto")).toBeTruthy();
  });

  it("não marca origem quando o consumo não veio de estimativa", () => {
    render(<CartaoConsumo nome="Whey" macros={MACROS} />);

    expect(screen.queryByText("Estimado por foto")).toBeNull();
  });

  it("relata o desvio como diferença informativa em relação ao planejado", () => {
    render(
      <CartaoConsumo
        nome="Café da manhã"
        macros={{ calorias: 264, proteinaG: 14, carboidratosG: 19, gordurasG: 15, fibrasG: 3 }}
        planejado={MACROS}
        expandido
      />,
    );

    expect(screen.getByText(/292 kcal a menos que o planejado \(556 kcal\)/)).toBeTruthy();
  });
});

describe("CartaoSessaoDiario", () => {
  it("leva ao resumo quando a sessão terminou e à sessão viva quando está em andamento", () => {
    const { rerender } = render(
      <CartaoSessaoDiario nome="Pull A" estado="concluida" href="/sessao/1/resumo" />,
    );
    expect(screen.getByText("Sessão de Treino concluída")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver" }).getAttribute("href")).toBe(
      "/sessao/1/resumo",
    );

    rerender(<CartaoSessaoDiario nome="Push B" estado="em_andamento" href="/sessao/2" />);
    expect(screen.getByText("Sessão de Treino em andamento")).toBeTruthy();
  });
});

describe("SeletorMetodoRegistro", () => {
  it("oferece os quatro métodos preservando dia e refeição planejada", () => {
    render(<SeletorMetodoRegistro dia="2026-08-30" refeicaoRef="almoco" />);
    for (const nome of ["foto", "texto", "áudio", "busca manual"]) {
      const link = screen.getByRole("link", { name: `Registrar por ${nome}` });
      expect(link.getAttribute("href")).toContain("dia=2026-08-30");
      expect(link.getAttribute("href")).toContain("refeicao=almoco");
    }
  });
});

describe("LinhaDoTempoDia", () => {
  it("mantém o cartão de Refeição extra no horário atual mesmo sem eventos", () => {
    render(<LinhaDoTempoDia itens={[]} dia="2026-08-30" fuso="America/Sao_Paulo" agora={new Date("2026-08-30T15:25:00Z")} confirmar={() => undefined} desfazer={() => undefined} />);
    const adicionarRefeicao = screen.getByRole("link", { name: "Adicionar refeição extra" });
    expect(adicionarRefeicao.parentElement?.className).toContain("h-72");
    expect(screen.getByText("12:25")).toBeTruthy();
  });

  it("mantém somente uma refeição expandida", () => {
    const itens = ["Café", "Almoço"].map((nome, indice) => ({ tipo: "planejada" as const, horaLocal: `${8 + indice}:00`, entrada: { refeicaoRef: nome, nome, horaLocal: `${8 + indice}:00`, itens: [{ descricao: `${nome} item`, ...MACROS }], macros: MACROS } }));
    render(<LinhaDoTempoDia itens={itens} dia="2026-08-30" fuso="America/Sao_Paulo" confirmar={() => undefined} desfazer={() => undefined} />);
    const botoes = screen.getAllByRole("button", { name: /Ver mais/ });
    fireEvent.click(botoes[0]);
    expect(botoes[0].getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(botoes[1]);
    expect(botoes[0].getAttribute("aria-expanded")).toBe("false");
    expect(botoes[1].getAttribute("aria-expanded")).toBe("true");
  });
});

describe("LinhaDoTempoDiario", () => {
  it("mantém a ordem cronológica em lista, com a hora em texto ao lado de cada evento", () => {
    render(
      <LinhaDoTempoDiario
        itens={[
          { id: "a", horaLocal: "07:29", conteudo: <p>Pull A</p> },
          { id: "b", horaLocal: "09:12", conteudo: <p>Café da manhã</p> },
        ]}
      />,
    );

    const lista = screen.getByRole("list", { name: "Linha do tempo do dia" });
    const itens = within(lista).getAllByRole("listitem");
    expect(itens).toHaveLength(2);
    expect(itens[0].textContent).toContain("07:29");
    expect(itens[1].textContent).toContain("09:12");
  });
});
