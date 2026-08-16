import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  calcularDeltaTendencia,
  LinhaTempoProgresso,
  SeloVariacao,
  SparklineTendencia,
  suavizarTendencia,
} from "../indicadores-tendencia";

afterEach(cleanup);

const serie = [
  { data: new Date(2026, 0, 1), valor: 80 },
  { data: new Date(2026, 0, 8), valor: 79 },
  { data: new Date(2026, 0, 15), valor: 78 },
];

describe("indicadores compactos de tendência", () => {
  it("mantém o cálculo compartilhado entre resumo e desenho", () => {
    const suave = suavizarTendencia(serie);
    const delta = calcularDeltaTendencia(serie);

    expect(suave).toHaveLength(3);
    expect(suave[2].valor).toBeLessThan(suave[0].valor);
    expect(delta).toMatchObject({ direcao: "queda", dias: 14 });
  });

  it("explicita direção, unidade e janela sem depender de cor", () => {
    render(
      <SeloVariacao
        delta={calcularDeltaTendencia(serie)}
        unidade="kg"
      />,
    );

    expect(screen.getByText(/kg/).textContent).toContain("em 14d");
  });

  it("trata a sparkline como apoio decorativo à métrica", () => {
    const { container } = render(
      <SparklineTendencia serie={serie} cor="text-nutrition-calories" />,
    );

    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("mantém data, título, detalhe e ação acessíveis na linha do tempo", () => {
    render(
      <LinhaTempoProgresso
        eventos={[
          {
            data: new Date(2026, 0, 15),
            titulo: "Peso",
            detalhe: "78,0 kg",
            acao: { rotulo: "Abrir registro", href: "/registro" },
          },
        ]}
      />,
    );

    expect(screen.getByText("Peso")).toBeTruthy();
    expect(screen.getByText("78,0 kg")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Abrir registro/ }).getAttribute("href"),
    ).toBe("/registro");
  });
});
