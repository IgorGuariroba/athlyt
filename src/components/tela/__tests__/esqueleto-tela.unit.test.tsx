import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  Esqueleto,
  EsqueletoCabecalho,
  EsqueletoLista,
  EsqueletoTela,
} from "../esqueleto-tela";

afterEach(cleanup);

describe("EsqueletoTela", () => {
  it("anuncia o carregamento uma única vez, como região viva", () => {
    render(
      <EsqueletoTela rotulo="Carregando o diário">
        <EsqueletoCabecalho />
        <EsqueletoLista />
      </EsqueletoTela>,
    );

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("Carregando o diário")).toBeDefined();
    // A silhueta inteira é decorativa: nenhuma barra concorre com o
    // anúncio da região viva.
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("esconde cada bloco da árvore de acessibilidade", () => {
    const { container } = render(<Esqueleto className="h-4 w-24" />);

    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("omite a linha de descrição quando o cabeçalho real não tem uma", () => {
    const { container, rerender } = render(<EsqueletoCabecalho />);
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(3);

    rerender(<EsqueletoCabecalho comDescricao={false} />);
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(2);
  });

  it("reserva um bloco por item esperado da lista", () => {
    const { container } = render(<EsqueletoLista itens={5} />);

    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(5);
  });
});
