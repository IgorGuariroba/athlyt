import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const registrarEvento = vi.fn<() => Promise<void>>();
const conexao = { encerradaLocalmente: false };

vi.mock("@/components/sessao/estado-conexao", () => ({
  useConexao: () => ({
    registrar: registrarEvento,
    registrosLocais: [],
    encerradaLocalmente: conexao.encerradaLocalmente,
  }),
}));

import { definirRitmoDescanso, reiniciarDescanso } from "@/lib/store-descanso";
import { reiniciarRascunhosSerie } from "@/lib/store-rascunho-serie";
import { RegistroSerie } from "@/components/sessao/registro-serie";
import { MARCA_ZERO } from "@/domain/sessao/recorde";

function promessaPendente() {
  let resolver!: () => void;
  const promessa = new Promise<void>((resolve) => {
    resolver = resolve;
  });
  return { promessa, resolver };
}

afterEach(() => {
  cleanup();
  conexao.encerradaLocalmente = false;
  registrarEvento.mockReset();
  reiniciarDescanso();
  reiniciarRascunhosSerie();
  window.localStorage.clear();
});

const propriedades = {
  sessionId: "sessao-teste",
  exercicioId: "supino",
  numero: 1,
  repeticoesSugeridas: "10",
  rirInicial: 2,
  rirSugerido: 2,
  descansoSeg: 90,
  concluida: false,
  cargaInicial: 40,
  cargaSugerida: 40,
  marcaHistorica: MARCA_ZERO,
  repeticoesIniciais: 10,
  seriesDoExercicio: [{ numero: 1, cargaKg: 40, repeticoes: 10, concluida: false }],
};

describe("RegistroSerie", () => {
  it("inicia o descanso sem aguardar a sincronização", async () => {
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
    });
    expect(screen.getByRole("dialog", { name: "Timer de descanso" })).toBeDefined();
    expect(screen.getByText("1:30")).toBeDefined();

    // Minimizar preserva a contagem: o pill continua o mesmo descanso.
    // Que ele fique acima da `BottomNav` é geometria, e jsdom não faz
    // layout — essa parte é verificada em `e2e/safe-area-standalone.e2e.test.ts`.
    fireEvent.click(screen.getByRole("button", { name: "Minimizar timer" }));
    expect(screen.queryByRole("dialog", { name: "Timer de descanso" })).toBeNull();
    expect(screen.getByRole("button", { name: /1:30/ })).toBeDefined();

    await act(async () => pendente.resolver());
  });

  it("conta o descanso escolhido para o exercício, e não o prescrito", async () => {
    const pendente = promessaPendente();
    registrarEvento.mockReturnValue(pendente.promessa);
    definirRitmoDescanso("supino", "longo");

    render(<RegistroSerie {...propriedades} />);
    fireEvent.click(screen.getByRole("button", { name: "Registrar série 1" }));

    // 90s prescritos, ritmo longo: 135s.
    expect(screen.getByText("2:15")).toBeDefined();

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

  it("mostra o selo de recorde apenas na última série registrada do exercício", () => {
    // A regra de qual série ostenta e contra que marca cada uma é
    // medida é do domínio (`linhaDeMarcas`); aqui só se verifica que a
    // tela exibe um único selo, na série que o domínio apontou.
    registrarEvento.mockResolvedValue();
    const marcaHistorica = { e1rmKg: 40, cargaKg: 40, volumeKg: 400 };
    const series = [
      { numero: 1, cargaKg: 80, repeticoes: 5, concluida: true },
      { numero: 2, cargaKg: 90, repeticoes: 4, concluida: true },
    ];

    render(
      <>
        <RegistroSerie {...propriedades} numero={1} concluida cargaInicial={80} repeticoesIniciais={5} marcaHistorica={marcaHistorica} seriesDoExercicio={series} />
        <RegistroSerie {...propriedades} numero={2} concluida cargaInicial={90} repeticoesIniciais={4} marcaHistorica={marcaHistorica} seriesDoExercicio={series} />
      </>,
    );

    expect(screen.getAllByText("Novo recorde de força")).toHaveLength(1);
  });

  it("deixa de oferecer o registro depois de o treino ser encerrado neste aparelho", () => {
    // Uma série enfileirada aqui teria ordem maior que o encerramento e
    // chegaria ao servidor sobre uma sessão já concluída.
    conexao.encerradaLocalmente = true;
    render(<RegistroSerie {...propriedades} />);

    expect(screen.queryByRole("button", { name: "Registrar série 1" })).toBeNull();
    expect(registrarEvento).not.toHaveBeenCalled();
  });

  it("avisa quando nem a persistência local consegue salvar a série", async () => {
    registrarEvento.mockRejectedValue(new Error("IndexedDB indisponível"));
    render(<RegistroSerie {...propriedades} />);

    fireEvent.click(screen.getByRole("button", { name: "Registrar série 1" }));

    expect((await screen.findByRole("alert")).textContent).toContain("A série não foi salva");
    expect(screen.getByRole("button", { name: "Registrar série 1" }).hasAttribute("disabled")).toBe(false);
  });
});
