import { cleanup, render, screen } from "@testing-library/react";
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
  container.querySelectorAll("circle[data-slot=\"medicao\"]").length;

describe("GraficoPeso", () => {
  it("não repete a faixa de valores no rodapé — a grade já a declara", () => {
    render(
      <GraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} horizonteDias={120} />,
    );

    expect(screen.queryByText(/–\s*90 kg/)).toBeNull();
  });

  it("relata a leitura por texto, sem depender do desenho", () => {
    render(
      <GraficoPeso
        medicoes={SERIE}
        pesoMetaKg={78}
        agora={noDia(60, 0).data}
        horizonteDias={120}
      />,
    );

    const resumo = screen.getByRole("img").getAttribute("aria-label") ?? "";
    expect(resumo).toContain("Peso inicial 90 kg");
    expect(resumo).toContain("atual 85 kg");
    expect(resumo).toContain("Ritmo médio até a meta de 78 kg em 120 dias");
  });

  it("marca o alvo quando o dia 120 cabe na janela", () => {
    const { container } = render(
      <GraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} horizonteDias={120} />,
    );

    expect(container.querySelector('circle[data-slot="alvo"]')).not.toBeNull();
  });

  it("não marca a ponta interpolada nos recortes curtos", () => {
    // Aos 30 dias a rampa termina onde o ritmo médio passa naquela
    // data (~87 kg), que não é a meta.
    for (const horizonteDias of [30, 90] as const) {
      const { container } = render(
        <GraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} horizonteDias={horizonteDias} />,
      );
      expect(container.querySelector('circle[data-slot="alvo"]')).toBeNull();
      cleanup();
    }
  });

  it("distingue o alvo das medições — anel vazado, não ponto cheio", () => {
    const { container } = render(
      <GraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} horizonteDias={120} />,
    );

    const alvo = container.querySelector('circle[data-slot="alvo"]')!;
    expect(alvo.getAttribute("fill")).toBe("none");
  });

  it("informa quanto falta para a meta", () => {
    render(
      <GraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} horizonteDias={120} />,
    );

    expect(screen.getByText("Faltam 7 kg")).toBeDefined();
  });

  it("anuncia meta alcançada ao cruzar o alvo", () => {
    render(
      <GraficoPeso
        medicoes={[noDia(0, 90), noDia(30, 77.5)]}
        pesoMetaKg={78}
        agora={noDia(30, 0).data}
        horizonteDias={120}
      />,
    );

    expect(screen.getByText("Meta alcançada")).toBeDefined();
  });

  it("rotula a grade com valores redondos", () => {
    const { container } = render(
      <GraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} horizonteDias={120} />,
    );

    const marcas = [...container.querySelectorAll("svg text")].map(
      (no) => no.textContent,
    );
    expect(marcas).toEqual(["75", "80", "85", "90"]);
  });

  it("desenha uma linha de grade por marca rotulada", () => {
    const { container } = render(
      <GraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} horizonteDias={120} />,
    );

    expect(container.querySelectorAll("svg line")).toHaveLength(
      container.querySelectorAll("svg text").length,
    );
  });

  it("declara a escala vertical também para quem lê por voz", () => {
    render(
      <GraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} horizonteDias={120} />,
    );

    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "Eixo vertical de 75 a 90 kg",
    );
  });

  it("enquadra meta e medições dentro da escala, sem cortar dado", () => {
    const { container } = render(
      <GraficoPeso
        medicoes={[noDia(0, 90), noDia(30, 88)]}
        pesoMetaKg={70}
        agora={noDia(30, 0).data}
        horizonteDias={120}
      />,
    );

    const marcas = [...container.querySelectorAll("svg text")].map((no) =>
      Number(no.textContent),
    );
    expect(Math.min(...marcas)).toBeLessThanOrEqual(70);
    expect(Math.max(...marcas)).toBeGreaterThanOrEqual(90);
  });

  it("marca cada medição com um ponto próprio", () => {
    const { container } = render(
      <GraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} horizonteDias={120} />,
    );

    expect(pontos(container)).toBe(3);
  });

  it("desenha o recorte que recebe, sem guardar período próprio", () => {
    const { container } = render(
      <GraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} horizonteDias={30} />,
    );

    expect(pontos(container)).toBe(2);
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "atual 87 kg",
    );
  });

  it("não embute o controle de período — ele é irmão na tela", () => {
    render(
      <GraficoPeso medicoes={SERIE} pesoMetaKg={78} agora={noDia(60, 0).data} />,
    );

    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("desenha a meta mesmo sem medição depois da inicial", () => {
    const { container } = render(
      <GraficoPeso
        medicoes={[noDia(0, 90)]}
        pesoMetaKg={78}
        agora={noDia(0, 0).data}
        horizonteDias={30}
      />,
    );

    expect(pontos(container)).toBe(1);
    expect(container.querySelectorAll("polyline")).toHaveLength(1);
    expect(screen.getByText("Ritmo médio até a meta")).toBeDefined();
  });

  it("sem nenhum peso registrado, convida ao primeiro registro em vez de desenhar", () => {
    render(<GraficoPeso medicoes={[]} pesoMetaKg={78} agora={INICIO} />);

    expect(screen.queryByRole("img")).toBeNull();
    expect(
      screen.getByText("Registre seu peso para acompanhar a evolução até a meta."),
    ).toBeDefined();
  });

  it("omite a legenda da meta enquanto ela não existir", () => {
    render(<GraficoPeso medicoes={SERIE} agora={noDia(60, 0).data} />);

    expect(screen.queryByText("Ritmo médio até a meta")).toBeNull();
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "Sem meta registrada",
    );
  });
});
