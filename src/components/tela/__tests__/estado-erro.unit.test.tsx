import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EstadoErro } from "../estado-erro";

afterEach(cleanup);

describe("EstadoErro", () => {
  it("explica a falha e oferece uma única ação de recuperação", () => {
    const recuperar = vi.fn();

    render(
      <EstadoErro
        titulo="Não foi possível continuar"
        descricao="Algo interrompeu esta etapa."
        statusDescricao="A ocorrência foi enviada para investigação."
        acao={<button onClick={recuperar}>Tentar novamente</button>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Não foi possível continuar" }),
    ).toBeDefined();
    expect(screen.getByText("Erro registrado")).toBeDefined();

    screen.getByRole("button", { name: "Tentar novamente" }).click();
    expect(recuperar).toHaveBeenCalledTimes(1);
  });

  it("mostra a referência apenas quando ela existe", () => {
    const { rerender } = render(
      <EstadoErro
        titulo="Erro"
        descricao="Descrição"
        statusDescricao="Registrado"
        acao={<button>Tentar novamente</button>}
      />,
    );

    expect(screen.queryByText("Referência do erro")).toBeNull();

    rerender(
      <EstadoErro
        titulo="Erro"
        descricao="Descrição"
        statusDescricao="Registrado"
        referencia="digest-123"
        acao={<button>Tentar novamente</button>}
      />,
    );

    expect(screen.getByText("Referência do erro")).toBeDefined();
    expect(screen.getByText("digest-123")).toBeDefined();
  });
});
