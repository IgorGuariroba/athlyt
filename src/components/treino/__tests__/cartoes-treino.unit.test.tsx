import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CartaoPlanoAtivo, CartaoSessaoDoDia } from "../cartoes-treino";

describe("cartões da tela de Treino", () => {
  it("expõe cartões compartilhados com conteúdo acessível", () => {
    render(<><CartaoSessaoDoDia>Retomar treino</CartaoSessaoDoDia><CartaoPlanoAtivo>Plano ativo</CartaoPlanoAtivo></>);
    expect(screen.getByText("Retomar treino")).toBeTruthy();
    expect(screen.getByText("Plano ativo")).toBeTruthy();
  });
});
