import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  BarraFaixa,
  BarraMacro,
  CabecalhoCartaoLista,
  CabecalhoSecao,
  CabecalhoTela,
  CartaoLista,
  ChipSelecao,
  ControleSegmentado,
  GraficoTendencia,
  LinhaCartaoLista,
  LinhasCartaoLista,
  PainelPendencias,
  Revelar,
  TelaConteudo,
} from "..";
import { cn } from "@/lib/utils";

afterEach(cleanup);

/**
 * O kit de telas é a superfície que padroniza o visual do produto: uma
 * regressão aqui vaza para toda tela construída sobre ele. Estes
 * testes fixam o contrato observável — papéis, rótulos acessíveis e as
 * decisões de DESIGN.md que só existem no componente.
 */
describe("CabecalhoTela", () => {
  it("expõe o título como o cabeçalho de nível 1 da tela", () => {
    render(<CabecalhoTela contexto="Revisão do plano" titulo="Treino dia a dia" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Treino dia a dia" }),
    ).toBeDefined();
  });

  it("mantém o contexto fora da hierarquia de cabeçalhos", () => {
    // O eyebrow é rótulo de seção, não título: se virasse heading,
    // criaria um nível falso na árvore de navegação do leitor de tela.
    render(<CabecalhoTela contexto="Seu programa" titulo="Plano pronto" />);

    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  it("renderiza a ação ao lado do contexto sem exigir descrição", () => {
    render(
      <CabecalhoTela
        contexto="Seu programa"
        titulo="Plano pronto"
        acao={<span>Modo Conservador</span>}
      />,
    );

    expect(screen.getByText("Modo Conservador")).toBeDefined();
  });
});

describe("CartaoLista", () => {
  it("associa o cartão ao seu próprio cabeçalho", () => {
    render(
      <CartaoLista aria-labelledby="dia-1">
        <CabecalhoCartaoLista id="dia-1" indicador={1} titulo="Empurrar" meta="Segunda" />
        <LinhasCartaoLista>
          <LinhaCartaoLista titulo="Supino reto com barra" />
        </LinhasCartaoLista>
      </CartaoLista>,
    );

    const cartao = screen.getByRole("region", { name: "Empurrar" });
    expect(within(cartao).getByRole("listitem")).toBeDefined();
  });

  it("agrupa as linhas em uma lista, e não em cartões independentes", () => {
    // DESIGN.md > Components > Card: "não transforme toda linha em card
    // se divisores bastarem". A lista é o que dá essa semântica.
    render(
      <LinhasCartaoLista>
        <LinhaCartaoLista titulo="Café da manhã" valor="613 kcal" />
        <LinhaCartaoLista titulo="Almoço" valor="858 kcal" />
      </LinhasCartaoLista>,
    );

    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("PainelPendencias", () => {
  it("separa pendências em linhas e mantém uma única ação de resolução", () => {
    render(
      <PainelPendencias
        titulo="Complete seu perfil"
        descricao="Orientações ajustadas aos seus dados."
        itens={[
          { id: "idade", titulo: "Idade", descricao: "Ajusta energia" },
          { id: "peso", titulo: "Peso", descricao: "Define a linha de base" },
        ]}
        acao={<button>Completar perfil</button>}
      />,
    );

    const painel = screen.getByRole("region", { name: "Complete seu perfil" });
    expect(within(painel).getAllByRole("listitem")).toHaveLength(2);
    expect(within(painel).getAllByRole("button")).toHaveLength(1);
  });
});

describe("BarraMacro", () => {
  it("descreve valor e participação em texto, não apenas por cor", () => {
    render(<BarraMacro macro="proteina" gramas={190} caloriasTotais={2450} />);

    // 190 g × 4 kcal = 760 kcal de 2450 ≈ 31%.
    expect(
      screen.getByRole("img", {
        name: "Proteína: 190 gramas, 31% da energia diária",
      }),
    ).toBeDefined();
  });

  it("mantém a barra visível quando a participação é mínima", () => {
    // Largura zero comunicaria "sem meta"; o valor real fica no texto.
    render(<BarraMacro macro="gorduras" gramas={1} caloriasTotais={2450} />);

    expect(
      screen.getByRole("img", { name: "Gorduras: 1 gramas, 4% da energia diária" }),
    ).toBeDefined();
  });

  it("não divide por zero quando ainda não há meta de energia", () => {
    render(<BarraMacro macro="carboidratos" gramas={0} caloriasTotais={0} />);

    expect(
      screen.getByRole("img", {
        name: "Carboidratos: 0 gramas, 0% da energia diária",
      }),
    ).toBeDefined();
  });
});

describe("Revelar", () => {
  it("mantém o conteúdo no DOM e fechado por padrão", () => {
    render(<Revelar rotulo="Por que este exercício?">Base de força.</Revelar>);

    const grupo = screen.getByRole("group");
    expect(grupo.getAttribute("open")).toBeNull();
    expect(screen.getByText("Base de força.")).toBeDefined();
  });
});

describe("TelaConteudo", () => {
  it("reserva espaço inferior quando existe CTA fixo", () => {
    // Sem esta folga o último item fica sob a barra fixa — DESIGN.md >
    // Accessibility: "conteúdo rolável não pode ficar escondido pelo CTA".
    const { container } = render(<TelaConteudo comAcaoFixa>conteúdo</TelaConteudo>);

    expect(container.querySelector("main")?.className).toContain("pb-28");
  });

  it("usa o padding padrão quando não há CTA fixo", () => {
    const { container } = render(<TelaConteudo>conteúdo</TelaConteudo>);

    expect(container.querySelector("main")?.className).toContain("pb-8");
  });
});

describe("CabecalhoSecao", () => {
  it("titula a seção em nível 2, abaixo do título da tela", () => {
    render(<CabecalhoSecao titulo="Tendência corporal" />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Tendência corporal" }),
    ).toBeDefined();
  });
});

describe("ControleSegmentado", () => {
  it("marca a opção vigente como o item atual da navegação", () => {
    render(
      <ControleSegmentado
        rotulo="Período dos gráficos"
        opcoes={[
          { valor: "30", rotulo: "30d", href: "?periodo=30", ativo: false },
          { valor: "90", rotulo: "90d", href: "?periodo=90", ativo: true },
        ]}
      />,
    );

    const grupo = screen.getByRole("navigation", { name: "Período dos gráficos" });
    expect(within(grupo).getByRole("link", { current: "page" }).textContent).toBe(
      "90d",
    );
  });
});

describe("ChipSelecao", () => {
  it("expõe um checkbox nomeado, com o chip inteiro como alvo", () => {
    render(
      <ChipSelecao id="enfase-ombros" name="enfases" value="ombros" rotulo="Ombros" />,
    );

    const chip = screen.getByRole("checkbox", { name: "Ombros" });
    expect(chip.getAttribute("value")).toBe("ombros");
    expect(chip.getAttribute("name")).toBe("enfases");
  });
});

describe("BarraFaixa", () => {
  const renderizar = () =>
    render(
      <BarraFaixa
        rotuloAcessivel="Cintura: atual 85,6 cm, faixa de 80 a 88 cm, meta 84,5 cm"
        atual={85.6}
        min={80}
        max={88}
        meta={84.5}
        unidade="cm"
      />,
    );

  it("descreve atual, faixa e meta em texto, não só pela posição", () => {
    renderizar();

    expect(
      screen.getByRole("img", {
        name: "Cintura: atual 85,6 cm, faixa de 80 a 88 cm, meta 84,5 cm",
      }),
    ).toBeDefined();
  });

  it("rótula os três valores que a régua compara", () => {
    // Três marcadores sem legenda não dizem qual é a medida atual, o
    // alvo do ciclo ou a faixa ideal — foi o que o usuário relatou.
    renderizar();

    expect(screen.getByText("Atual")).toBeDefined();
    expect(screen.getByText("Meta do ciclo")).toBeDefined();
    expect(screen.getByText("Faixa ideal")).toBeDefined();
  });

  it("mostra o valor de cada um dos três, com a faixa como intervalo", () => {
    renderizar();

    expect(screen.getByText("85,6")).toBeDefined();
    expect(screen.getByText("84,5")).toBeDefined();
    expect(screen.getByText("80–88")).toBeDefined();
  });
});

describe("GraficoTendencia", () => {
  const ponto = (dia: number, valor: number) => ({
    data: new Date(2026, 0, dia),
    valor,
  });

  it("resume a série em texto com unidade, período e variação", () => {
    render(
      <GraficoTendencia
        titulo="Peso"
        unidade="kg"
        series={[{ valores: [ponto(1, 80), ponto(15, 82)] }]}
      />,
    );

    const grafico = screen.getByRole("img");
    // O resumo é o que um leitor de tela recebe no lugar do desenho.
    expect(grafico.getAttribute("aria-label")).toContain("kg");
    expect(grafico.getAttribute("aria-label")).toContain("alta de 2");
  });

  it("explica a ausência de tendência em vez de desenhar um ponto solto", () => {
    render(
      <GraficoTendencia titulo="Cintura" unidade="cm" series={[{ valores: [ponto(1, 88)] }]} />,
    );

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText(/segundo ponto comparável/)).toBeDefined();
  });

  it("nomeia cada série quando duas dividem o mesmo eixo", () => {
    // Comparar lados é o propósito do dado bilateral: as duas séries
    // precisam ser identificáveis sem depender da cor.
    render(
      <GraficoTendencia
        titulo="Braços"
        unidade="cm"
        series={[
          { nome: "Direito", valores: [ponto(1, 36.5), ponto(15, 37.1)] },
          { nome: "Esquerdo", valores: [ponto(1, 36.2), ponto(15, 36.6)] },
        ]}
      />,
    );

    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "Direito",
    );
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("cn", () => {
  it("preserva a cor do texto ao lado de um token da escala tipográfica", () => {
    // `text-label-lg` é tamanho, não cor: sem ensinar isso ao
    // tailwind-merge, ele descartava `text-primary-foreground` e o CTA
    // branco ficava com texto branco.
    expect(cn("text-primary-foreground", "text-label-lg")).toBe(
      "text-primary-foreground text-label-lg",
    );
  });

  it("continua resolvendo conflito real entre dois tamanhos", () => {
    expect(cn("text-body-sm", "text-title")).toBe("text-title");
  });
});
