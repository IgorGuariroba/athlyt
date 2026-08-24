import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CartaoPlanoAtivo, CartaoSessaoDoDia } from "../cartoes-inicio";

describe("cartões da tela inicial", () => {
  it("expõe cartões compartilhados com conteúdo acessível", () => {
    render(<><CartaoSessaoDoDia>Retomar treino</CartaoSessaoDoDia><CartaoPlanoAtivo>Plano ativo</CartaoPlanoAtivo></>);
    expect(screen.getByText("Retomar treino")).toBeTruthy();
    expect(screen.getByText("Plano ativo")).toBeTruthy();
  });
});
