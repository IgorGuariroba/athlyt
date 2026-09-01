import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PainelPeso } from "../painel-peso";

afterEach(cleanup);

describe("PainelPeso", () => {
  it("mantém medição e meta editáveis na mesma ação explícita", () => {
    render(<PainelPeso pesoAtualKg={82.4} pesoMetaKg={76} aoSalvar={vi.fn()} />);

    expect(screen.getByLabelText("Peso atual").getAttribute("value")).toBe("82.4");
    expect(screen.getByLabelText("Peso meta").getAttribute("value")).toBe("76");
    expect(screen.getByRole("button", { name: "Salvar pesos" })).toBeDefined();
  });

  it("limita os dois valores ao contrato de peso corporal", () => {
    render(<PainelPeso aoSalvar={vi.fn()} />);

    for (const campo of [screen.getByLabelText("Peso atual"), screen.getByLabelText("Peso meta")]) {
      expect(campo.getAttribute("min")).toBe("30");
      expect(campo.getAttribute("max")).toBe("300");
      expect(campo.getAttribute("step")).toBe("0.1");
    }
  });
});
