import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { lerDescanso, reiniciarDescanso } from "@/lib/store-descanso";
import { AjusteDescanso } from "@/components/sessao/ajuste-descanso";

afterEach(() => {
  cleanup();
  reiniciarDescanso();
  window.localStorage.clear();
});

describe("AjusteDescanso", () => {
  it("oferece três durações derivadas da prescrição do exercício", () => {
    render(<AjusteDescanso exercicioId="supino" descansoPrescritoSeg={90} />);

    const grupo = screen.getByRole("radiogroup", { name: "Descanso entre séries" });
    expect(grupo.textContent).toBe("1:001:302:15");
  });

  it("começa no descanso do plano quando não há escolha anterior", () => {
    render(<AjusteDescanso exercicioId="supino" descansoPrescritoSeg={90} />);

    const escolhida = screen.getByRole("radio", { checked: true });
    expect(escolhida.getAttribute("aria-label")).toBe("Descanso do plano: 1:30");
  });

  it("guarda a escolha para o exercício, e não para a sessão", () => {
    render(<AjusteDescanso exercicioId="supino" descansoPrescritoSeg={90} />);

    fireEvent.click(screen.getByRole("radio", { name: "Descanso curto: 1:00" }));

    expect(lerDescanso()).toEqual({ supino: "curto" });
    expect(
      screen.getByRole<HTMLInputElement>("radio", { name: "Descanso curto: 1:00" }).checked,
    ).toBe(true);
  });
});
