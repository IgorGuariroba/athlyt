import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const registrarEvento = vi.fn<() => Promise<void>>();

vi.mock("../estado-conexao", () => ({
  useConexao: () => ({
    registrar: registrarEvento,
    registrosLocais: [],
    copiloto: { estado: "inativo" },
  }),
}));

import { RegistroSerie } from "../registro-serie";

function promessaPendente() {
  let resolver!: () => void;
  const promessa = new Promise<void>((resolve) => {
    resolver = resolve;
  });
  return { promessa, resolver };
}

afterEach(() => {
  cleanup();
  registrarEvento.mockReset();
});

const propriedades = {
  exercicioId: "supino",
  numero: 1,
  repeticoesSugeridas: "10",
  rirSugerido: 2,
  descansoSeg: 90,
  concluida: false,
  cargaInicial: 40,
  cargaSugerida: 40,
  melhorCargaAnterior: 35,
  repeticoesIniciais: 10,
  temProximaSerie: true,
};

describe("RegistroSerie", () => {
  it("inicia o descanso sem aguardar a sincronização e o Copiloto", async () => {
    const pendente = promessaPendente();
    registrarEvento.mockReturnValue(pendente.promessa);

    render(<RegistroSerie {...propriedades} />);

    fireEvent.click(screen.getByRole("button", { name: "Registrar série 1" }));
    await waitFor(() => expect(registrarEvento).toHaveBeenCalledTimes(1));

    expect(registrarEvento).toHaveBeenCalledWith("serie_registrada", {
      exercicioId: "supino",
      numero: 1,
      cargaKg: 40,
      repeticoes: 10,
      rir: 2,
    }, 2);
    expect(screen.getByRole("dialog", { name: "Timer de descanso" })).toBeDefined();
    expect(screen.getByText("1:30")).toBeDefined();

    await act(async () => pendente.resolver());
  });

  it("mantém a validação nativa antes de iniciar o fluxo", () => {
    registrarEvento.mockResolvedValue();
    render(<RegistroSerie {...propriedades} cargaInicial={null} cargaSugerida={0} />);

    fireEvent.change(screen.getByRole("spinbutton", { name: "KG" }), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar série 1" }));

    expect(registrarEvento).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Timer de descanso" })).toBeNull();
  });

  it("avisa quando nem a persistência local consegue salvar a série", async () => {
    registrarEvento.mockRejectedValue(new Error("IndexedDB indisponível"));
    render(<RegistroSerie {...propriedades} />);

    fireEvent.click(screen.getByRole("button", { name: "Registrar série 1" }));

    expect((await screen.findByRole("alert")).textContent).toContain("A série não foi salva");
    expect(screen.getByRole("button", { name: "Registrar série 1" }).hasAttribute("disabled")).toBe(false);
  });
});
