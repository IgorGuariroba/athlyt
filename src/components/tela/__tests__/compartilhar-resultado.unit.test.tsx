import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CompartilharResultado } from "../compartilhar-resultado";

afterEach(cleanup);

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn<Element["scrollIntoView"]>();
});

const dados = {
  nome: "Segunda-feira - A",
  duracaoMin: 54,
  totalSeries: 18,
  volumeKg: 8760,
  recordes: [{ nome: "Supino reto com barra", valor: 82 }],
  exercicios: [
    { nome: "Supino reto com barra" },
    { nome: "Remada curvada" },
  ],
};

describe("CompartilharResultado", () => {
  it("oferece apenas o ícone de compartilhamento como ação", () => {
    render(<CompartilharResultado {...dados} />);

    const botao = screen.getByRole("button", {
      name: /Compartilhar no Instagram/,
    });
    expect(botao).toBeDefined();
    expect(botao.textContent).toBe("");
    expect(botao.querySelector("svg")).toBeTruthy();
    expect(botao.hasAttribute("disabled")).toBe(false);
    expect(botao.getAttribute("type")).toBe("button");

    // O card é gerado apenas para o compartilhamento; não ocupa espaço na tela.
    expect(screen.queryByText("Resumo compartilhável")).toBeNull();
  });

  it("não começa com aviso de status", () => {
    render(<CompartilharResultado {...dados} />);

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("informa a falha em vez de quebrar a tela quando o canvas não está disponível", async () => {
    render(<CompartilharResultado {...dados} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Compartilhar no Instagram/ }),
    );

    expect(
      await screen.findByText(/Não foi possível compartilhar agora/),
    ).toBeDefined();
  });
});
