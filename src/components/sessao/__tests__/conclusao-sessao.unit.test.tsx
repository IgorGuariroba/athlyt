import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const registrarEvento = vi.fn<() => Promise<void>>();
const conexao = {
  estado: "offline" as string,
  registrosLocais: [] as { exercicioId: string; numero: number }[],
  encerradaLocalmente: false,
  registrar: registrarEvento,
};

vi.mock("@/components/sessao/estado-conexao", () => ({
  useConexao: () => conexao,
}));

import { ConclusaoSessao } from "@/components/sessao/conclusao-sessao";

afterEach(() => {
  cleanup();
  registrarEvento.mockReset();
  Object.assign(conexao, { estado: "offline", registrosLocais: [], encerradaLocalmente: false });
});

describe("ConclusaoSessao", () => {
  it("encerra sem rede pela fila local, sem esperar o servidor", async () => {
    registrarEvento.mockResolvedValue();

    render(<ConclusaoSessao concluirAction={() => Promise.resolve(undefined)} seriesPendentes={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Concluir treino" }));

    await waitFor(() => expect(registrarEvento).toHaveBeenCalledWith("sessao_concluida", {}));
  });

  it("substitui o botão pelo aviso quando este aparelho já encerrou o treino", () => {
    conexao.encerradaLocalmente = true;

    render(<ConclusaoSessao concluirAction={() => Promise.resolve(undefined)} seriesPendentes={2} />);

    expect(screen.queryByRole("button", { name: "Concluir treino" })).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Treino encerrado neste aparelho");
  });

  it("online e sem fila, usa a server action que leva ao resumo", () => {
    conexao.estado = "online";

    render(<ConclusaoSessao concluirAction={() => Promise.resolve(undefined)} seriesPendentes={0} />);

    const botao = screen.getByRole("button", { name: "Concluir treino" });
    expect(botao.closest("form")).not.toBeNull();
    expect(screen.getByText("Todas as séries foram registradas.")).toBeDefined();
  });
});
