import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { GraficoPeso } from "../grafico-peso";

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

describe("GraficoPeso", () => {
  it("relata a leitura por texto, sem depender do desenho", () => {
    render(
      <GraficoPeso
        medicoes={SERIE}
        pesoMetaKg={78}
        agora={noDia(60, 0).data}
        horizonteInicial={120}
      />,
    );

    const resumo = screen.getByRole("img").getAttribute("aria-label") ?? "";
    expect(resumo).toContain("Peso inicial 90 kg");
    expect(resumo).toContain("atual 85 kg");
    expect(resumo).toContain("Meta 78 kg em 120 dias");
  });

  it("marca cada medição com um ponto próprio", () => {
    const { container } = render(
      <GraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} horizonteInicial={120} />,
    );

    expect(pontos(container)).toBe(3);
  });

  it("troca o horizonte sem recarregar e recorta as medições exibidas", async () => {
    const { container } = render(
      <GraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} horizonteInicial={120} />,
    );
    expect(pontos(container)).toBe(3);

    await userEvent.click(screen.getByRole("radio", { name: "30 dias" }));

    expect(pontos(container)).toBe(2);
    expect(
      screen.getByRole("img").getAttribute("aria-label"),
    ).toContain("atual 87 kg");
  });

  it("oferece os três recortes como grupo de escolha única", () => {
    render(<GraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} />);

    const grupo = screen.getByRole("radiogroup", { name: "Período do gráfico" });
    expect(grupo).toBeDefined();
    for (const dias of [30, 90, 120]) {
      expect(screen.getByRole("radio", { name: `${dias} dias` })).toBeDefined();
    }
  });

  it("desenha a meta mesmo sem medição depois da inicial", () => {
    const { container } = render(
      <GraficoPeso
        medicoes={[noDia(0, 90)]}
        pesoMetaKg={78}
        agora={noDia(0, 0).data}
        horizonteInicial={30}
      />,
    );

    expect(pontos(container)).toBe(1);
    expect(container.querySelectorAll("polyline")).toHaveLength(1);
    expect(screen.getByText("Meta em 120 dias")).toBeDefined();
  });

  it("sem nenhum peso registrado, convida ao primeiro registro em vez de desenhar", () => {
    render(<GraficoPeso medicoes={[]} pesoMetaKg={78} agora={INICIO} />);

    expect(screen.queryByRole("img")).toBeNull();
    // Um seletor de período sem nada para recortar seria um controle morto.
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(
      screen.getByText("Registre seu peso para acompanhar a evolução até a meta."),
    ).toBeDefined();
  });

  it("omite a legenda da meta enquanto ela não existir", () => {
    render(<GraficoPeso medicoes={SERIE} agora={noDia(60, 0).data} />);

    expect(screen.queryByText("Meta em 120 dias")).toBeNull();
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "Sem meta registrada",
    );
  });
});
