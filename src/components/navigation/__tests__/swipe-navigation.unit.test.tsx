import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const routerPush = vi.hoisted(() => vi.fn());
const pathname = vi.hoisted(() => ({ value: "/inicio" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
  useRouter: () => ({ push: routerPush }),
}));

import { SwipeNavigation } from "../swipe-navigation";

afterEach(() => {
  cleanup();
  routerPush.mockClear();
  pathname.value = "/inicio";
});

describe("SwipeNavigation", () => {
  it("navega para a próxima aba ao deslizar para a esquerda", () => {
    const { container } = render(
      <SwipeNavigation>
        <span>Início</span>
      </SwipeNavigation>,
    );
    const superficie = container.querySelector("[data-swipe-navigation]") as HTMLElement;

    fireEvent.pointerDown(superficie, {
      pointerType: "touch",
      clientX: 300,
      clientY: 200,
    });
    fireEvent.pointerMove(superficie, {
      pointerType: "touch",
      clientX: 200,
      clientY: 204,
    });
    fireEvent.pointerUp(superficie, {
      pointerType: "touch",
      clientX: 200,
      clientY: 204,
    });

    expect(routerPush).toHaveBeenCalledWith("/diario");
  });

  it("não intercepta a rolagem vertical", () => {
    const { container } = render(
      <SwipeNavigation>
        <span>Início</span>
      </SwipeNavigation>,
    );
    const superficie = container.querySelector("[data-swipe-navigation]") as HTMLElement;

    fireEvent.pointerDown(superficie, {
      pointerType: "touch",
      clientX: 200,
      clientY: 200,
    });
    fireEvent.pointerMove(superficie, {
      pointerType: "touch",
      clientX: 204,
      clientY: 100,
    });
    fireEvent.pointerUp(superficie, {
      pointerType: "touch",
      clientX: 204,
      clientY: 100,
    });

    expect(routerPush).not.toHaveBeenCalled();
  });

  /**
   * O timer de descanso e a ficha do exercício são `fixed` mas nascem
   * dentro desta árvore (sem `createPortal`), então seus gestos sobem
   * por bubbling até o swipe e trocariam de aba por baixo do modal.
   */
  it("não troca de aba com gesto iniciado dentro de um modal", () => {
    const { container } = render(
      <SwipeNavigation>
        <div role="dialog" aria-label="Timer de descanso">
          <button type="button">Fechar timer</button>
        </div>
      </SwipeNavigation>,
    );
    const superficie = container.querySelector("[data-swipe-navigation]") as HTMLElement;
    const dentroDoModal = container.querySelector("button") as HTMLElement;

    fireEvent.pointerDown(dentroDoModal, {
      pointerType: "touch",
      clientX: 300,
      clientY: 200,
      bubbles: true,
    });
    fireEvent.pointerMove(superficie, {
      pointerType: "touch",
      clientX: 200,
      clientY: 204,
    });
    fireEvent.pointerUp(superficie, {
      pointerType: "touch",
      clientX: 200,
      clientY: 204,
    });

    expect(routerPush).not.toHaveBeenCalled();
  });

  /**
   * `FichaExercicio` põe o `role="dialog"` no painel interno, e não no
   * backdrop `fixed`. Arrastar no escurecido ao redor também é gesto
   * dentro do modal.
   */
  it("não troca de aba com gesto no backdrop de um modal", () => {
    const { container } = render(
      <SwipeNavigation>
        <div data-testid="backdrop" className="fixed inset-0">
          <section role="dialog" aria-modal="true">
            Ficha do exercício
          </section>
        </div>
      </SwipeNavigation>,
    );
    const superficie = container.querySelector("[data-swipe-navigation]") as HTMLElement;
    const backdrop = container.querySelector('[data-testid="backdrop"]') as HTMLElement;

    fireEvent.pointerDown(backdrop, {
      pointerType: "touch",
      clientX: 300,
      clientY: 200,
      bubbles: true,
    });
    fireEvent.pointerMove(superficie, {
      pointerType: "touch",
      clientX: 200,
      clientY: 204,
    });
    fireEvent.pointerUp(superficie, {
      pointerType: "touch",
      clientX: 200,
      clientY: 204,
    });

    expect(routerPush).not.toHaveBeenCalled();
  });

  it("não troca de aba quando um modal abre durante o gesto", () => {
    const { container } = render(
      <SwipeNavigation>
        <span>Início</span>
      </SwipeNavigation>,
    );
    const superficie = container.querySelector("[data-swipe-navigation]") as HTMLElement;

    fireEvent.pointerDown(superficie, {
      pointerType: "touch",
      clientX: 300,
      clientY: 200,
    });
    fireEvent.pointerMove(superficie, {
      pointerType: "touch",
      clientX: 200,
      clientY: 204,
    });

    // O timer sobe sozinho ao terminar o descanso, no meio do gesto.
    const modal = document.createElement("div");
    modal.setAttribute("role", "dialog");
    document.body.appendChild(modal);

    fireEvent.pointerUp(superficie, {
      pointerType: "touch",
      clientX: 200,
      clientY: 204,
    });

    expect(routerPush).not.toHaveBeenCalled();
    modal.remove();
  });
});
