import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AvisoAcao } from "../aviso-acao";

afterEach(cleanup);

/**
 * O componente existe por causa de um sintoma de campo: numa tela
 * longa, o aviso de erro no topo do formulário nasce fora da dobra do
 * botão, o usuário toca em enviar, nada muda no campo de visão e ele
 * conclui que o botão não funciona. As duas garantias que evitam isso
 * — trazer o aviso ao campo de visão e levar o foco até ele — são o
 * contrato do componente, não detalhe de estilo, e é isso que estes
 * testes fixam.
 *
 * `scrollIntoView` não existe no jsdom; o espião serve tanto de
 * implementação quanto de asserção.
 */
describe("AvisoAcao", () => {
  let rolagem: ReturnType<typeof vi.fn<Element["scrollIntoView"]>>;

  beforeEach(() => {
    rolagem = vi.fn<Element["scrollIntoView"]>();
    Element.prototype.scrollIntoView = rolagem;
  });

  it("anuncia erro como alerta e sucesso como status", () => {
    const { unmount } = render(<AvisoAcao tipo="erro">Falhou.</AvisoAcao>);
    expect(screen.getByRole("alert").textContent).toContain("Falhou.");
    unmount();

    render(<AvisoAcao tipo="sucesso">Deu certo.</AvisoAcao>);
    expect(screen.getByRole("status").textContent).toContain("Deu certo.");
  });

  it("traz o aviso ao campo de visão assim que aparece", () => {
    render(<AvisoAcao tipo="erro">Selecione ao menos uma foto.</AvisoAcao>);

    expect(rolagem).toHaveBeenCalledTimes(1);
    expect(rolagem.mock.calls[0]?.[0]).toMatchObject({ block: "center" });
  });

  it("move o foco para o aviso, para que o leitor de tela pare nele", () => {
    render(<AvisoAcao tipo="erro">Selecione ao menos uma foto.</AvisoAcao>);

    expect(document.activeElement).toBe(screen.getByRole("alert"));
  });

  it("rola de novo quando a segunda tentativa falha com outra mensagem", () => {
    // Sem reagir à troca de texto, um erro diferente na mesma montagem
    // ficaria parado fora da tela — exatamente o caso do usuário que
    // insiste no botão e continua sem retorno visível.
    const { rerender } = render(<AvisoAcao tipo="erro">Primeiro erro.</AvisoAcao>);
    expect(rolagem).toHaveBeenCalledTimes(1);

    rerender(<AvisoAcao tipo="erro">Segundo erro, diferente.</AvisoAcao>);
    expect(rolagem).toHaveBeenCalledTimes(2);
  });
});
