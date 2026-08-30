import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { itemEstimado, type ItemPrato } from "@/domain/alimentos/prato";
import { CapturaAudio } from "../captura-audio";
import {
  RegistroPorDescricao,
  type EstimativaDescrita,
  type ResultadoEstimativa,
  type ResultadoRegistro,
  type ResultadoTranscricao,
} from "../registro-por-descricao";
import { RevisaoEstimativa } from "../revisao-estimativa";

// A volta ao Diário após gravar é navegação do App Router, que não
// existe fora do servidor. O que estes testes verificam é o que a tela
// entrega à server action antes disso.
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

afterEach(cleanup);

const ARROZ = itemEstimado({
  descricao: "Arroz branco cozido",
  quantidadeGramas: 100,
  calorias: 128, proteinaG: 2, carboidratosG: 28, gordurasG: 0, fibrasG: 1,
  confianca: "media", modelo: "modelo-x", origemEstimativa: "texto",
});
const BIFE = itemEstimado({
  descricao: "Bife grelhado",
  quantidadeGramas: 120,
  calorias: 250, proteinaG: 32, carboidratosG: 0, gordurasG: 13, fibrasG: 0,
  confianca: "alta", modelo: "modelo-x", origemEstimativa: "texto",
});

const ESTIMATIVA: EstimativaDescrita = {
  nome: "Almoço: arroz e bife",
  itens: [ARROZ, BIFE],
  porcoesDescritas: ["duas colheres", "um bife médio"],
  limitacoes: ["A quantidade de arroz não foi informada."],
  confianca: "media",
  descricaoUsada: "Duas colheres de arroz e um bife médio.",
  origem: "texto",
};

/**
 * O contrato desta camada é o que o Registro Retroativo não pode
 * perder ao ser recomposto: estimativa distinguível de medição, a
 * descrição que a originou visível, revisão antes de gravar e aviso
 * explícito antes de substituir um Consumo Real existente.
 */
describe("RevisaoEstimativa", () => {
  function montar(itens: ItemPrato[] = [ARROZ, BIFE], props = {}) {
    const aoMudar = vi.fn();
    render(
      <RevisaoEstimativa
        itens={itens}
        aoMudar={aoMudar}
        porcoesDescritas={["duas colheres", "um bife médio"]}
        limitacoes={["A quantidade de arroz não foi informada."]}
        confianca="media"
        origemEstimativa="texto"
        {...props}
      />,
    );
    return aoMudar;
  }

  it("mostra a incerteza e as limitações antes da lista, sem falar em foto", () => {
    montar();

    expect(screen.getByText("A quantidade de arroz não foi informada.")).toBeTruthy();
    expect(screen.queryByText(/na foto/i)).toBeNull();
    expect(screen.getAllByText(/Estimativa —/).length).toBeGreaterThan(0);
  });

  it("mostra a porção como o atleta a descreveu ao lado das gramas inferidas", () => {
    montar();

    expect(screen.getByText("você descreveu: duas colheres")).toBeTruthy();
    expect(screen.getByLabelText("Gramas de Arroz branco cozido")).toBeTruthy();
  });

  it("soma o total dos itens visíveis, e não o da estimativa original", () => {
    montar();

    expect(screen.getByText(/378 kcal/)).toBeTruthy();
  });

  it("corrigir a porção reescala o item sem promover a estimativa", async () => {
    const aoMudar = montar();

    fireEvent.change(screen.getByLabelText("Gramas de Arroz branco cozido"), {
      target: { value: "50" },
    });

    const itens = aoMudar.mock.calls.at(-1)![0] as ItemPrato[];
    expect(itens[0].quantidade).toBe(50);
    expect(itens[0].origemDado).toBe("estimativa-ia");
  });

  it("corrigir o alimento preserva os macros: dizer o que era não é dizer quanto era", async () => {
    const aoMudar = montar();

    fireEvent.change(screen.getByLabelText("Alimento 1"), {
      target: { value: "Arroz integral cozido" },
    });

    const itens = aoMudar.mock.calls.at(-1)![0] as ItemPrato[];
    expect(itens[0].descricao).toBe("Arroz integral cozido 100 g");
    expect(itens[0].calorias).toBe(ARROZ.calorias);
  });

  it("aceita nome composto digitado tecla a tecla", async () => {
    // Regressão: o campo é controlado pela descrição do item, então um
    // `trim` no caminho de renomear apagava cada espaço no keystroke em
    // que ele era digitado — "Coca cola zero" virava "Cocacolazero" e
    // nenhum alimento de mais de uma palavra podia ser corrigido.
    // Só digitação real reproduz: um único `fireEvent.change` com o
    // texto pronto passa mesmo com o defeito presente.
    let itens: ItemPrato[] = [ARROZ];
    const aoMudar = vi.fn((novos: ItemPrato[]) => {
      itens = novos;
      exibir();
    });
    const props = {
      aoMudar,
      limitacoes: [],
      confianca: "media" as const,
      origemEstimativa: "texto" as const,
    };
    const { rerender } = render(<RevisaoEstimativa itens={itens} {...props} />);
    const exibir = () => rerender(<RevisaoEstimativa itens={itens} {...props} />);

    const campo = screen.getByLabelText("Alimento 1");
    await userEvent.clear(campo);
    await userEvent.type(campo, "Coca cola zero");

    expect((campo as HTMLInputElement).value).toBe("Coca cola zero");
    expect(itens[0].descricao).toBe("Coca cola zero 100 g");
  });

  it("remover um item tira-o do conjunto que será gravado", async () => {
    const aoMudar = montar();

    await userEvent.click(screen.getByRole("button", { name: "Remover Bife grelhado" }));

    expect(aoMudar).toHaveBeenCalledWith([ARROZ]);
  });

  it("o alimento acrescentado à mão entra como entrada do atleta, não como estimativa da IA", async () => {
    const aoMudar = montar();

    await userEvent.click(screen.getByRole("button", { name: /Faltou um alimento/ }));
    await userEvent.type(screen.getByLabelText("Alimento que faltou"), "Pão de queijo");
    await userEvent.type(screen.getByLabelText("Energia (kcal)"), "180");
    await userEvent.click(screen.getByRole("button", { name: /Acrescentar/ }));

    const itens = aoMudar.mock.calls.at(-1)![0] as ItemPrato[];
    expect(itens).toHaveLength(3);
    expect(itens[2].origemDado).toBe("usuario");
    expect(itens[2].calorias).toBe(180);
  });
});

describe("RegistroPorDescricao", () => {
  const acoes = () => ({
    estimar: vi.fn<(fd: FormData) => Promise<ResultadoEstimativa>>(async () => ({
      ok: true,
      estimativa: ESTIMATIVA,
    })),
    transcrever: vi.fn<(fd: FormData) => Promise<ResultadoTranscricao>>(async () => ({
      ok: true,
      transcricao: "Duas colheres de arroz e um bife médio.",
      trechosIncertos: ["bife médio"],
    })),
    registrar: vi.fn<(fd: FormData) => Promise<ResultadoRegistro>>(async () => ({ ok: true })),
  });

  function montar(props = {}) {
    const fns = acoes();
    render(
      <RegistroPorDescricao
        dia="2026-05-20"
        horaInicial="12:30"
        nomeInicial="Almoço"
        categorias={["Almoço", "Jantar"]}
        {...fns}
        {...props}
      />,
    );
    return fns;
  }

  it("oferece escrever e falar como caminhos equivalentes para descrever", () => {
    montar();

    expect(screen.getByRole("button", { name: /Escrever/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Falar/ })).toBeTruthy();
  });

  it("nada é gravado ao estimar: a IA propõe, o atleta confirma", async () => {
    const { estimar, registrar } = montar();

    await userEvent.type(screen.getByLabelText("Descrição da refeição"), "arroz e bife");
    await userEvent.click(screen.getByRole("button", { name: /Estimar calorias e macros/ }));

    await screen.findByRole("heading", { name: "Confira antes de registrar" });
    expect(estimar).toHaveBeenCalledOnce();
    expect(registrar).not.toHaveBeenCalled();
  });

  it("falha na estimativa preserva a descrição digitada", async () => {
    const fns = acoes();
    fns.estimar = vi.fn<(fd: FormData) => Promise<ResultadoEstimativa>>(async () => ({
      ok: false,
      erro: "Indisponível agora.",
    }));
    render(
      <RegistroPorDescricao
        dia="2026-05-20" horaInicial="12:30" nomeInicial="Almoço"
        categorias={["Almoço"]} {...fns}
      />,
    );

    const campo = screen.getByLabelText("Descrição da refeição");
    await userEvent.type(campo, "arroz e bife");
    await userEvent.click(screen.getByRole("button", { name: /Estimar calorias e macros/ }));

    await screen.findByText("Indisponível agora.");
    expect((campo as HTMLTextAreaElement).value).toBe("arroz e bife");
  });

  it("o áudio passa pela transcrição editável antes de virar número", async () => {
    const { transcrever, estimar } = montar();

    await userEvent.click(screen.getByRole("button", { name: /Falar/ }));
    // Sem gravação não há o que transcrever, e a estimativa não é
    // oferecida: o passo intermediário é obrigatório no caminho do áudio.
    expect(screen.getByRole("button", { name: /Transcrever o áudio/ }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(transcrever).not.toHaveBeenCalled();
    expect(estimar).not.toHaveBeenCalled();
  });

  it("mostra a descrição que originou a estimativa, para o registro ficar auditável", async () => {
    montar();

    await userEvent.type(screen.getByLabelText("Descrição da refeição"), "arroz e bife");
    await userEvent.click(screen.getByRole("button", { name: /Estimar calorias e macros/ }));

    await screen.findByRole("heading", { name: "Confira antes de registrar" });
    expect(screen.getByText("Duas colheres de arroz e um bife médio.")).toBeTruthy();
  });

  it("permite corrigir nome, dia e horário antes de confirmar", async () => {
    const { registrar } = montar();

    await userEvent.type(screen.getByLabelText("Descrição da refeição"), "arroz e bife");
    await userEvent.click(screen.getByRole("button", { name: /Estimar calorias e macros/ }));
    await screen.findByRole("heading", { name: "Confira antes de registrar" });

    await userEvent.clear(screen.getByLabelText("Horário da refeição"));
    await userEvent.type(screen.getByLabelText("Horário da refeição"), "15:45");
    await userEvent.click(screen.getByRole("button", { name: /Registrar no Diário/ }));

    await waitFor(() => expect(registrar).toHaveBeenCalledOnce());
    const fd = registrar.mock.calls[0][0];
    expect(fd.get("hora")).toBe("15:45");
    expect(fd.get("nome")).toBe("Almoço: arroz e bife");
  });

  it("avisa antes de substituir um Consumo Real existente, e cancelar não grava", async () => {
    const { registrar } = montar({
      refeicaoRef: "1-Almoço",
      consumoExistente: {
        nome: "Almoço",
        macros: { calorias: 620, proteinaG: 41, carboidratosG: 63, gordurasG: 18, fibrasG: 7 },
      },
    });

    await userEvent.type(screen.getByLabelText("Descrição da refeição"), "arroz e bife");
    await userEvent.click(screen.getByRole("button", { name: /Estimar calorias e macros/ }));
    await screen.findByRole("heading", { name: "Confira antes de registrar" });

    await userEvent.click(screen.getByRole("button", { name: /Registrar no Diário/ }));
    const aviso = screen.getByRole("alertdialog", { name: "Substituir o registro atual" });
    expect(within(aviso).getByText(/620 kcal/)).toBeTruthy();
    expect(registrar).not.toHaveBeenCalled();

    await userEvent.click(within(aviso).getByRole("button", { name: "Cancelar" }));
    expect(registrar).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Registrar no Diário/ })).toBeTruthy();
  });

  it("confirmar a substituição grava mantendo o vínculo com a Refeição Planejada", async () => {
    const { registrar } = montar({
      refeicaoRef: "1-Almoço",
      consumoExistente: {
        nome: "Almoço",
        macros: { calorias: 620, proteinaG: 41, carboidratosG: 63, gordurasG: 18, fibrasG: 7 },
      },
    });

    await userEvent.type(screen.getByLabelText("Descrição da refeição"), "arroz e bife");
    await userEvent.click(screen.getByRole("button", { name: /Estimar calorias e macros/ }));
    await screen.findByRole("heading", { name: "Confira antes de registrar" });
    await userEvent.click(screen.getByRole("button", { name: /Registrar no Diário/ }));
    await userEvent.click(screen.getByRole("button", { name: "Substituir" }));

    await waitFor(() => expect(registrar).toHaveBeenCalledOnce());
    // O vínculo com a Refeição Planejada é o que faz a gravação
    // substituir em vez de somar um segundo almoço ao dia.
    const fd = registrar.mock.calls[0][0];
    expect(fd.get("refeicaoRef")).toBe("1-Almoço");
  });

  it("sem consumo existente, confirmar não pede nenhum aviso extra", async () => {
    const { registrar } = montar();

    await userEvent.type(screen.getByLabelText("Descrição da refeição"), "arroz e bife");
    await userEvent.click(screen.getByRole("button", { name: /Estimar calorias e macros/ }));
    await screen.findByRole("heading", { name: "Confira antes de registrar" });
    await userEvent.click(screen.getByRole("button", { name: /Registrar no Diário/ }));

    await waitFor(() => expect(registrar).toHaveBeenCalledOnce());
  });
});

describe("CapturaAudio", () => {
  it("orienta a gravar e não expõe controle de reprodução antes de existir áudio", () => {
    render(<CapturaAudio audio={null} aoGravar={() => {}} dica="Diga o que comeu." />);

    expect(screen.getByRole("button", { name: /Gravar descrição/ })).toBeTruthy();
    expect(screen.getByText("Diga o que comeu.")).toBeTruthy();
    expect(screen.queryByLabelText("Áudio gravado")).toBeNull();
  });

  it("com áudio gravado, oferece ouvir antes de enviar e regravar", () => {
    const arquivo = new File([new Uint8Array([1])], "descricao", { type: "audio/webm" });
    render(<CapturaAudio audio={arquivo} aoGravar={() => {}} />);

    expect(screen.getByLabelText("Áudio gravado")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Gravar de novo/ })).toBeTruthy();
  });
});
