import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BottomNav } from "../bottom-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/progresso/fotos",
}));

afterEach(cleanup);

describe("BottomNav", () => {
  it("preserva os destinos e identifica a rota aninhada ativa", () => {
    render(<BottomNav />);

    const navegacao = screen.getByRole("navigation", {
      name: "Navegação principal",
    });
    const links = screen.getAllByRole("link");

    expect(navegacao.contains(links[0])).toBe(true);
    expect(links).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Dieta" }).getAttribute("href")).toBe(
      "/dieta",
    );
    expect(screen.getByRole("link", { name: "Treino" }).getAttribute("href")).toBe(
      "/treino",
    );
    expect(
      screen.getByRole("link", { name: "Progresso" }).getAttribute("href"),
    ).toBe("/progresso");
    expect(screen.getByRole("link", { name: "Mais" }).getAttribute("href")).toBe(
      "/mais",
    );
    expect(
      screen.getByRole("link", { name: "Progresso" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("exibe texto apenas na aba ativa e nomeia as demais", () => {
    render(<BottomNav />);

    expect(screen.getByRole("link", { name: "Progresso" }).textContent).toBe(
      "Progresso",
    );
    expect(screen.getByRole("link", { name: "Dieta" }).textContent).toBe("");
    expect(screen.getByRole("link", { name: "Treino" }).textContent).toBe("");
    expect(screen.getByRole("link", { name: "Mais" }).textContent).toBe("");
  });
});
