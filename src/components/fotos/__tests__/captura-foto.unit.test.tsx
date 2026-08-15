import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CapturaFoto } from "../captura-foto";

afterEach(cleanup);

/**
 * O contrato deste componente é o gesto que ele encurta: fotografar
 * direto pela câmera traseira sem passar por um menu do sistema, e ver
 * o que foi capturado antes de enviar. As duas garantias abaixo são o
 * que se perde se alguém "simplificar" para um único seletor de
 * arquivo.
 */
describe("CapturaFoto", () => {
  beforeEach(() => {
    let sequencia = 0;
    globalThis.URL.createObjectURL = vi.fn(() => `blob:previa-${(sequencia += 1)}`);
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  function seletores() {
    // Os inputs são visualmente ocultos: os botões é que são tocados.
    return Array.from(document.querySelectorAll("input[type=file]"));
  }

  it("oferece um caminho direto de câmera, além da galeria", () => {
    render(<CapturaFoto arquivo={null} aoEscolher={() => {}} />);

    const capturas = seletores().filter((input) => input.hasAttribute("capture"));
    expect(capturas).toHaveLength(1);
    expect(capturas[0].getAttribute("capture")).toBe("environment");
    expect(seletores()).toHaveLength(2);
    expect(screen.getByRole("button", { name: /tirar foto/i })).toBeDefined();
  });

  it("mostra a prévia do que foi capturado, em vez de só o nome do arquivo", () => {
    const arquivo = new File(["x"], "prato.jpg", { type: "image/jpeg" });
    render(<CapturaFoto arquivo={arquivo} aoEscolher={() => {}} />);

    expect(screen.getByAltText(/prévia/i).getAttribute("src")).toBe("blob:previa-1");
  });

  it("libera a URL da prévia anterior ao trocar de foto", () => {
    // Sem isso, cada nova tentativa vaza um blob na memória da aba —
    // e esta é uma tela de uso repetido, várias vezes por dia.
    const primeira = new File(["a"], "a.jpg", { type: "image/jpeg" });
    const segunda = new File(["b"], "b.jpg", { type: "image/jpeg" });
    const { rerender } = render(<CapturaFoto arquivo={primeira} aoEscolher={() => {}} />);

    rerender(<CapturaFoto arquivo={segunda} aoEscolher={() => {}} />);

    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith("blob:previa-1");
  });
});
