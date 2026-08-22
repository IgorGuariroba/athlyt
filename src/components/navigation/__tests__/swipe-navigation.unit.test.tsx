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
});
