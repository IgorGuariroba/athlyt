import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SeletorHorizonte } from "../seletor-horizonte";

afterEach(cleanup);

describe("SeletorHorizonte", () => {
  it("oferece os três recortes como escolha única, com a unidade no nome acessível", () => {
    render(<SeletorHorizonte valor={30} aoMudar={vi.fn()} />);

    expect(
      screen.getByRole("radiogroup", { name: "Período do gráfico" }),
    ).toBeDefined();
    for (const dias of [30, 90, 120]) {
      expect(screen.getByRole("radio", { name: `${dias} dias` })).toBeDefined();
    }
  });

  it("marca o recorte vigente", () => {
    render(<SeletorHorizonte valor={90} aoMudar={vi.fn()} />);

    expect(
      (screen.getByRole("radio", { name: "90 dias" }) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("devolve dias como número, não como texto do formulário", async () => {
    const aoMudar = vi.fn();
    render(<SeletorHorizonte valor={30} aoMudar={aoMudar} />);

    await userEvent.click(screen.getByRole("radio", { name: "120 dias" }));

    expect(aoMudar).toHaveBeenCalledWith(120);
  });
});
