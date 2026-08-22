import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CompartilharResultado } from "../compartilhar-resultado";

afterEach(cleanup);

// `AvisoAcao` chama `scrollIntoView`, que o jsdom não implementa. Mesmo
// stub usado em `aviso-acao.unit.test.tsx`.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn<Element["scrollIntoView"]>();
});

/**
 * O card 9:16 é a peça de saída do produto: o que o atleta publica nos
 * Stories. O PNG real (1080x1920) é julgado pela evidência E2E
 * (`e2e/compartilhar-resultado.e2e.test.ts`), porque canvas não existe
 * em jsdom. Aqui o contrato é o outro lado da mesma peça: a prévia em
 * tela precisa mostrar os mesmos dados que o canvas desenha — kicker,
 * título, métricas e faixa de conquista — e a ação de compartilhar
 * precisa existir e permanecer acionável.
 *
 * Nenhuma asserção olha pixel, cor ou classe: o agente que reescreve a
 * composição do card deve poder mexer no layout sem quebrar este teste,
 * desde que a informação continue lá.
 */

const dados = {
  nome: "Segunda-feira - A",
  duracaoMin: 54,
  totalSeries: 18,
  volumeKg: 8760,
  recordes: [{ nome: "Supino reto com barra", valor: 82 }],
  exercicios: [
    { nome: "Supino reto com barra" },
    { nome: "Remada curvada" },
    { nome: "Desenvolvimento militar" },
  ],
};

/**
 * Menor ancestral do kicker que também contém a faixa de conquista —
 * ou seja, o card inteiro e nada do que vem depois dele. Subir por
 * conteúdo, e não por classe utilitária ou profundidade fixa de div,
 * mantém o teste válido enquanto a composição do card evolui.
 */
function previa() {
  const kicker = screen.getByText("Resumo compartilhável");
  const faixa =
    screen.queryByText("Recorde desbloqueado") ??
    screen.queryByText("Treino registrado");
  if (!faixa) throw new Error("Faixa de conquista do card não encontrada");

  let no: HTMLElement | null = kicker;
  while (no && !no.contains(faixa)) no = no.parentElement;
  if (!no) throw new Error("Prévia do card não encontrada");
  return no;
}

describe("CompartilharResultado", () => {
  it("mostra na prévia o nome do treino e as três métricas da sessão", () => {
    render(<CompartilharResultado {...dados} />);

    const card = previa();
    expect(within(card).getByText("Resumo compartilhável")).toBeDefined();
    expect(within(card).getByText("Segunda-feira - A")).toBeDefined();

    // Rótulo e valor de cada métrica, com a unidade ao lado do número.
    // O volume aparece formatado em pt-BR ("8.760"), como na referência:
    // milhar sem separador vira um borrão de dígitos no Story.
    for (const [rotulo, valor, unidade] of [
      [/^Duração$/, "54", "min"],
      [/^Séries$/, "18", "total"],
      [/Volume/, "8.760", "kg"],
    ] as Array<[RegExp, string, string]>) {
      expect(within(card).getByText(rotulo)).toBeDefined();
      expect(within(card).getByText(unidade)).toBeDefined();
      expect(card.textContent).toContain(valor);
    }
  });

  it("anuncia o recorde na faixa de conquista quando a sessão bateu um", () => {
    render(<CompartilharResultado {...dados} />);

    const card = previa();
    expect(within(card).getByText("Recorde desbloqueado")).toBeDefined();
    expect(card.textContent).toContain("Supino reto com barra");
    expect(within(card).queryByText("Treino registrado")).toBeNull();
  });

  it("cai para o registro do treino quando não houve recorde, sem deixar a faixa vazia", () => {
    render(<CompartilharResultado {...dados} recordes={[]} />);

    const card = previa();
    expect(within(card).getByText("Treino registrado")).toBeDefined();
    // O destaque não some: passa a ser o próprio nome do treino.
    expect(card.textContent).toContain("Segunda-feira - A");
    expect(within(card).queryByText("Recorde desbloqueado")).toBeNull();
    expect(card.textContent).not.toContain("undefined");
    expect(card.textContent).not.toContain("NaN");
  });

  it("oferece o botão de compartilhar nos Stories", () => {
    render(<CompartilharResultado {...dados} />);

    const botao = screen.getByRole("button", {
      name: /Compartilhar no Instagram/,
    });
    expect(botao).toBeDefined();
    expect(botao.hasAttribute("disabled")).toBe(false);
    // `type="button"`: o resumo pode estar dentro de um form e o card
    // não pode submeter nada ao ser gerado.
    expect(botao.getAttribute("type")).toBe("button");
  });

  it("não começa com aviso de status: a mensagem só aparece após a tentativa", () => {
    render(<CompartilharResultado {...dados} />);

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("informa a falha em vez de quebrar a tela quando o canvas não está disponível", async () => {
    // jsdom não implementa getContext("2d"): é exatamente o cenário de
    // navegador sem suporte, e o resumo da sessão não pode virar tela
    // branca por causa dele.
    render(<CompartilharResultado {...dados} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Compartilhar no Instagram/ }),
    );

    const aviso = await screen.findByText(/Não foi possível compartilhar agora/);
    expect(aviso).toBeDefined();
    // A prévia continua em pé depois do erro.
    expect(within(previa()).getByText("Segunda-feira - A")).toBeDefined();
  });

  it("mantém a prévia legível com nome longo e volume de quatro dígitos", () => {
    render(
      <CompartilharResultado
        {...dados}
        nome="Segunda-feira - A (Superior de Empurrar e Puxar)"
        volumeKg={12480}
      />,
    );

    const card = previa();
    expect(card.textContent).toContain(
      "Segunda-feira - A (Superior de Empurrar e Puxar)",
    );
    expect(card.textContent).toContain("12.480");
  });
});
