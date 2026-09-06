import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { itemEstimado, type ItemPrato } from "@/domain/alimentos/prato";
import { AcrescentarAlimento, type ResultadoComItens } from "../acrescentar-alimento";

afterEach(cleanup);

const PAO = itemEstimado({
  descricao: "Pão de queijo",
  quantidade: 90,
  calorias: 270, proteinaG: 8, carboidratosG: 24, gordurasG: 16, fibrasG: 0,
  confianca: "media", modelo: "modelo-x", origemEstimativa: "texto",
});

const CAFE = itemEstimado({
  descricao: "Café com leite",
  quantidade: 200,
  unidade: "ml",
  calorias: 90, proteinaG: 5, carboidratosG: 8, gordurasG: 4, fibrasG: 0,
  confianca: "baixa", modelo: "modelo-x", origemEstimativa: "texto",
});

function acoes(itens: ItemPrato[] = [PAO]) {
  return {
    estimarDescricao: vi.fn<(fd: FormData) => Promise<ResultadoComItens>>(() =>
      Promise.resolve({
        ok: true,
        estimativa: { itens },
      }),
    ),
    estimarFoto: vi.fn<(fd: FormData) => Promise<ResultadoComItens>>(() =>
      Promise.resolve({
        ok: true,
        estimativa: { itens },
      }),
    ),
    transcrever: vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        transcricao: "um pão de queijo",
        trechosIncertos: [],
      }),
    ),
  };
}

/**
 * O contrato do acréscimo dentro da revisão: as mesmas três entradas do
 * registro inicial (escrever, falar, fotografar), nenhuma delas pedindo
 * macros ao atleta, e o resultado somando ao prato em vez de substituí-lo.
 */
describe("AcrescentarAlimento", () => {
  function montar(props = {}) {
    const fns = acoes();
    const aoAcrescentar = vi.fn();
    render(
      <AcrescentarAlimento
        dia="2026-05-20"
        aoAcrescentar={aoAcrescentar}
        aoFechar={vi.fn()}
        {...fns}
        {...props}
      />,
    );
    return { ...fns, aoAcrescentar };
  }

  it("nunca pede energia nem macros ao atleta", () => {
    montar();

    expect(screen.queryByLabelText(/Energia \(kcal\)/)).toBeNull();
    expect(screen.queryByLabelText(/Proteína/)).toBeNull();
    expect(screen.queryByLabelText(/Carboidratos/)).toBeNull();
    expect(screen.queryByLabelText(/Gorduras/)).toBeNull();
  });

  it("oferece escrever, falar e fotografar", () => {
    montar();

    expect(screen.getByRole("button", { name: /Escrever/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Falar/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Fotografar/ })).toBeTruthy();
  });

  it("estima pela descrição e entrega os itens ao prato", async () => {
    const { estimarDescricao, aoAcrescentar } = montar();

    await userEvent.type(screen.getByLabelText(/O que faltou/), "um pão de queijo");
    await userEvent.click(screen.getByRole("button", { name: /Acrescentar ao prato/ }));

    await waitFor(() => expect(aoAcrescentar).toHaveBeenCalledWith([PAO]));
    const corpo = estimarDescricao.mock.calls[0]![0];
    expect(corpo.get("descricao")).toBe("um pão de queijo");
    expect(corpo.get("dia")).toBe("2026-05-20");
  });

  it("acrescenta todos os itens que a estimativa trouxe, não só o primeiro", async () => {
    const { aoAcrescentar } = montar({
      estimarDescricao: vi.fn(() =>
        Promise.resolve({
          ok: true as const,
          estimativa: { itens: [PAO, CAFE] },
        }),
      ),
    });

    await userEvent.type(screen.getByLabelText(/O que faltou/), "pão de queijo e café com leite");
    await userEvent.click(screen.getByRole("button", { name: /Acrescentar ao prato/ }));

    await waitFor(() => expect(aoAcrescentar).toHaveBeenCalledWith([PAO, CAFE]));
  });

  it("falha da IA não acrescenta nada e preserva o que foi escrito", async () => {
    const { aoAcrescentar } = montar({
      estimarDescricao: vi.fn(() =>
        Promise.resolve({ ok: false as const, erro: "Estimativa indisponível." }),
      ),
    });

    await userEvent.type(screen.getByLabelText(/O que faltou/), "um pão de queijo");
    await userEvent.click(screen.getByRole("button", { name: /Acrescentar ao prato/ }));

    await waitFor(() => expect(screen.getByText("Estimativa indisponível.")).toBeTruthy());
    expect(aoAcrescentar).not.toHaveBeenCalled();
    expect(screen.getByLabelText<HTMLTextAreaElement>(/O que faltou/).value).toBe(
      "um pão de queijo",
    );
  });
});
