import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { PainelGraficoPeso } from "../painel-grafico-peso";

afterEach(cleanup);

const INICIO = new Date(2026, 0, 1);
const DIA = 24 * 60 * 60 * 1000;
const noDia = (dias: number, pesoKg: number) => ({
  data: new Date(INICIO.getTime() + dias * DIA),
  pesoKg,
});

const SERIE = [noDia(0, 90), noDia(30, 87), noDia(60, 85)];

const pontos = (container: HTMLElement) =>
  container.querySelectorAll("circle").length;

describe("PainelGraficoPeso", () => {
  it("recorta o gráfico ao trocar o período, sem recarregar a tela", async () => {
    const { container } = render(
      <PainelGraficoPeso
        medicoes={SERIE}
        pesoMetaKg={78}
        agora={noDia(60, 0).data}
        horizonteInicial={120}
      />,
    );
    expect(pontos(container)).toBe(3);

    await userEvent.click(screen.getByRole("radio", { name: "30 dias" }));

    expect(pontos(container)).toBe(2);
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "atual 87 kg",
    );
  });

  it("apresenta o filtro antes da figura que ele recorta", () => {
    const { container } = render(
      <PainelGraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} />,
    );

    const grupo = screen.getByRole("radiogroup", { name: "Período do gráfico" });
    const figura = container.querySelector("figure")!;
    expect(
      grupo.compareDocumentPosition(figura) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("mantém o controle fora do cartão do gráfico", () => {
    const { container } = render(
      <PainelGraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} />,
    );

    const grupo = screen.getByRole("radiogroup");
    expect(container.querySelector("figure")!.contains(grupo)).toBe(false);
  });

  it("oferece os três recortes como escolha única", () => {
    render(<PainelGraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} />);

    for (const dias of [30, 90, 120]) {
      expect(screen.getByRole("radio", { name: `${dias} dias` })).toBeDefined();
    }
  });

  it("não oferece filtro quando não há peso algum para recortar", () => {
    render(<PainelGraficoPeso medicoes={[]} pesoMetaKg={78} agora={INICIO} />);

    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(
      screen.getByText("Registre seu peso para acompanhar a evolução até a meta."),
    ).toBeDefined();
  });
});
