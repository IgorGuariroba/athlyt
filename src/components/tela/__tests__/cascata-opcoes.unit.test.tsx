import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RadioGroup } from "@/components/ui/radio-group";
import { CascataShell, CartaoCheckbox, CartaoRadio } from "..";
import { TransicaoEtapa } from "../transicao-etapa";

afterEach(cleanup);

describe("CartaoRadio", () => {
  it("associa título e descrição ao controle de opção", () => {
    render(
      <RadioGroup defaultValue="recomposicao">
        <CartaoRadio
          id="objetivo-recomposicao"
          value="recomposicao"
          titulo="Recomposição corporal"
          descricao="Reduzir gordura e desenvolver massa muscular"
        />
      </RadioGroup>,
    );

    expect(
      screen.getByRole("radio", {
        name: /Recomposição corporal.*Reduzir gordura e desenvolver massa muscular/,
      }).getAttribute("aria-checked"),
    ).toBe("true");
  });
});

describe("CartaoCheckbox", () => {
  it("expõe o estado inicial pelo controle acessível", () => {
    render(
      <CartaoCheckbox
        id="dia-segunda"
        name="dias"
        value="segunda"
        titulo="Segunda-feira"
        defaultChecked
      />,
    );

    const opcao = screen.getByRole("checkbox", { name: "Segunda-feira" });
    expect(opcao.getAttribute("aria-checked")).toBe("true");
  });
});

describe("TransicaoEtapa", () => {
  it("renderiza o conteúdo dentro da superfície animada", () => {
    render(<TransicaoEtapa indice={2}>Conteúdo em transição</TransicaoEtapa>);

    expect(screen.getByText("Conteúdo em transição")).toBeDefined();
  });
});

describe("CascataShell", () => {
  it("expõe progresso, posição, retorno e título da etapa", () => {
    render(
      <CascataShell titulo="Objetivo atual" indice={5} total={14} elemento="section">
        <p>Conteúdo da etapa</p>
      </CascataShell>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Objetivo atual" })).toBeDefined();
    expect(screen.getByRole("progressbar")).toBeDefined();
    expect(screen.getByText("Etapa 5 de 14")).toBeDefined();
    expect(screen.getByRole("link", { name: "Voltar" })).toBeDefined();
  });
});
