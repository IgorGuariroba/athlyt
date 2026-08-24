import { cleanup, render, screen } from "@testing-library/react";
import { Award } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";

import {
  CartaoLista,
  LinhaCartaoLista,
  LinhasCartaoLista,
  NotaLinha,
  SeloConclusao,
  ValorComSelo,
} from "..";

afterEach(cleanup);

describe("SeloConclusao", () => {
  it("expõe o resultado como o cabeçalho de nível 1 da tela", () => {
    render(<SeloConclusao Icone={Award} contexto="Treino concluído" titulo="Pull A" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Pull A" }),
    ).toBeDefined();
  });

  it("mantém o contexto fora da hierarquia de cabeçalhos", () => {
    // Assim como no eyebrow de CabecalhoTela: "Treino concluído" é
    // rótulo, não título — viraria um nível falso no leitor de tela.
    render(<SeloConclusao Icone={Award} contexto="Treino concluído" titulo="Pull A" />);

    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  it("diz o desfecho em palavras, e não apenas pela cor do selo", () => {
    // DESIGN.md > Accessibility: estado nunca é comunicado só por cor.
    // O tom `atencao` é reforço do que contexto e descrição já dizem.
    render(
      <SeloConclusao
        Icone={Award}
        tom="atencao"
        contexto="Sessão encerrada"
        titulo="Pull A"
        descricao="Motivo: dor"
      />,
    );

    expect(screen.getByText("Sessão encerrada")).toBeDefined();
    expect(screen.getByText("Motivo: dor")).toBeDefined();
  });

  it("omite a nota de desfecho quando não há motivo a declarar", () => {
    const { container } = render(
      <SeloConclusao Icone={Award} contexto="Treino concluído" titulo="Pull A" />,
    );

    expect(container.querySelectorAll("p")).toHaveLength(1);
  });
});

describe("ValorComSelo", () => {
  it("mantém selo e número como uma única leitura", () => {
    // O valor sozinho não diz por que está ali; o selo sozinho não diz
    // quanto. É o par que informa.
    render(<ValorComSelo selo="Recorde">60 kg</ValorComSelo>);

    expect(screen.getByText("Recorde")).toBeDefined();
    expect(screen.getByText(/60 kg/)).toBeDefined();
  });

  it("aplica o tom como variante do Badge, sem cor solta na tela", () => {
    render(
      <ValorComSelo selo="Na meta" tom="success">
        84,5 cm
      </ValorComSelo>,
    );

    expect(screen.getByText("Na meta").getAttribute("data-variant")).toBe(
      "success",
    );
  });

  it("cabe no slot de valor de uma linha da lista", () => {
    render(
      <CartaoLista>
        <LinhasCartaoLista>
          <LinhaCartaoLista
            titulo="Puxada na polia alta"
            valor={<ValorComSelo selo="Recorde">60 kg</ValorComSelo>}
          />
        </LinhasCartaoLista>
      </CartaoLista>,
    );

    expect(screen.getByRole("listitem").textContent).toContain("Recorde");
  });
});

describe("NotaLinha", () => {
  it("fica subordinada ao item, e não como uma nova entrada da lista", () => {
    render(
      <LinhasCartaoLista>
        <LinhaCartaoLista titulo="Remada curvada" meta="10×60 kg">
          <NotaLinha>Interrompido após 2 de 4 séries</NotaLinha>
        </LinhaCartaoLista>
      </LinhasCartaoLista>,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Interrompido após 2 de 4 séries")).toBeDefined();
  });
});
