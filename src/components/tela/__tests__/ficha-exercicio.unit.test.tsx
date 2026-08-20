import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FichaExercicio } from "../ficha-exercicio";

afterEach(cleanup);

/**
 * Mídia de Execução (CONTEXT.md): sem vídeo/animação disponível ainda,
 * o fallback em texto é a única fonte de "como executar" durante a
 * sessão. O componente é o ponto de entrada — ícone junto ao nome do
 * exercício, como no Alpha Progression (workflow-imagens-references/
 * alpha-progression/050 e 062) — para essa instrução, escondida por
 * padrão para não competir com o registro de série.
 */
describe("FichaExercicio", () => {
  it("começa fechada, sem expor a instrução de execução", () => {
    render(
      <FichaExercicio
        nome="Supino reto com barra"
        grupo="peito"
        grupoMuscular="Peito"
        comoExecutar="Deite no banco e empurre a barra."
      />,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Deite no banco e empurre a barra.")).toBeNull();
  });

  it("abre a ficha do exercício ao tocar no botão de informação, com o diagrama de músculos-alvo", () => {
    render(
      <FichaExercicio
        nome="Supino reto com barra"
        grupo="peito"
        grupoMuscular="Peito"
        comoExecutar="Deite no banco e empurre a barra."
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver como executar Supino reto com barra" }));

    const dialogo = screen.getByRole("dialog", { name: "Supino reto com barra" });
    expect(dialogo.textContent).toContain("Peito");
    expect(dialogo.textContent).toContain("Deite no banco e empurre a barra.");
    expect(dialogo.querySelector("svg")).not.toBeNull();
  });

  it("fecha ao tocar em fechar", () => {
    render(
      <FichaExercicio
        nome="Supino reto com barra"
        grupo="peito"
        grupoMuscular="Peito"
        comoExecutar="Deite no banco e empurre a barra."
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver como executar Supino reto com barra" }));
    fireEvent.click(screen.getByRole("button", { name: "Fechar ficha do exercício" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("exibe a animação da Mídia de Execução quando midiaUrl é informada, sem esconder o fallback em texto", () => {
    render(
      <FichaExercicio
        nome="Supino reto com barra"
        grupo="peito"
        grupoMuscular="Peito"
        comoExecutar="Deite no banco e empurre a barra."
        midiaUrl="/api/midia-execucao/supino-barra"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver como executar Supino reto com barra" }));

    const dialogo = screen.getByRole("dialog", { name: "Supino reto com barra" });
    const imagem = dialogo.querySelector("img");
    expect(imagem).not.toBeNull();
    expect(imagem?.getAttribute("src")).toBe("/api/midia-execucao/supino-barra");
    expect(dialogo.textContent).toContain("Deite no banco e empurre a barra.");
  });

  it("cai para o fallback quando a animação falha ao carregar (offline sem cache)", () => {
    render(
      <FichaExercicio
        nome="Supino reto com barra"
        grupo="peito"
        grupoMuscular="Peito"
        comoExecutar="Deite no banco e empurre a barra."
        midiaUrl="/api/midia-execucao/supino-barra"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver como executar Supino reto com barra" }));
    const dialogo = screen.getByRole("dialog", { name: "Supino reto com barra" });
    const imagem = dialogo.querySelector("img")!;

    fireEvent.error(imagem);

    expect(dialogo.querySelector("img")).toBeNull();
    expect(dialogo.textContent).toContain("Deite no banco e empurre a barra.");
  });

  it("sem midiaUrl, mostra apenas o diagrama de músculos-alvo e o texto", () => {
    render(
      <FichaExercicio
        nome="Supino reto com barra"
        grupo="peito"
        grupoMuscular="Peito"
        comoExecutar="Deite no banco e empurre a barra."
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver como executar Supino reto com barra" }));
    const dialogo = screen.getByRole("dialog", { name: "Supino reto com barra" });

    expect(dialogo.querySelector("img")).toBeNull();
    expect(dialogo.querySelector("svg")).not.toBeNull();
    expect(dialogo.textContent).toContain("Deite no banco e empurre a barra.");
  });
});
