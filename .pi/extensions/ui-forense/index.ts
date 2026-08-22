/**
 * Depurador forense de interface do Athlyt.
 *
 * O problema que esta extensão resolve não é "ver a tela" — o modelo já
 * enxerga a captura. É que a leitura visual produz opinião não
 * falsificável: "esse botão parece pequeno", "o destrutivo chama mais
 * atenção". Ela pode estar certa e não há como saber, e o falso
 * positivo custa o mesmo que o achado real.
 *
 * As cinco ferramentas formam um ciclo:
 *
 *   ui_abrir       — o que existe na tela? (inventário e1..eN)
 *   ui_inspecionar — o que esse elemento é de verdade?
 *   ui_interagir   — o que acontece quando eu ajo sobre ele?
 *   ui_varrer      — existe defeito objetivo aqui?
 *   ui_verificar   — consigo provar o que suspeito?
 *
 * Complementa `ui_componentes`, que é estática (lê o texto do arquivo
 * antes de escrever). Esta é dinâmica: mede o pixel que o navegador
 * pintou, onde vive o desvio que nenhum grep encontra.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";

import { avaliarAlvoDeToque, avaliarFoco, avaliarOverflow } from "./checagens";
import {
  SELETOR_DE_INTERESSE,
  scriptFoco,
  scriptHitTest,
  scriptInventario,
  scriptLerShifts,
} from "./coleta";
import { numerarInventario } from "./inventario";
import {
  baseUrl,
  fecharSessao,
  obterSessao,
  resolverViewport,
  sessaoAtual,
  VIEWPORTS_NOMEADOS,
} from "./navegador";
import { avaliarTokens, lerEscalaDeTokens, type EscalaDeTokens } from "./tokens";
import type { ElementoInventariado, NoColetado } from "./tipos";
import { verificarHipotese, type Criterio } from "./verificacao";

const CHECKS = [
  "acessibilidade",
  "overflow",
  "oclusao",
  "foco",
  "tokens",
  "alvo-de-toque",
  "layout-shift",
  "console",
] as const;

export default function extensaoUiForense(pi: ExtensionAPI) {
  /** Inventário da última observação: é o que dá sentido a `e17`. */
  let inventario: ElementoInventariado[] = [];
  let rotaAtual = "";
  let escala: EscalaDeTokens | null = null;

  function escalaDeTokens(cwd: string): EscalaDeTokens {
    if (!escala) {
      escala = lerEscalaDeTokens(readFileSync(join(cwd, "src/app/globals.css"), "utf8"));
    }
    return escala;
  }

  function exigirElemento(id: string): ElementoInventariado {
    const alvo = inventario.find((item) => item.id === id);
    if (!alvo) {
      throw new Error(
        inventario.length === 0
          ? `Nenhum inventário ativo. Chame ui_abrir antes de referenciar "${id}".`
          : `Elemento "${id}" não existe no inventário atual de ${rotaAtual} (e1..e${inventario.length}).`,
      );
    }
    return alvo;
  }

  function texto(conteudo: string) {
    return { content: [{ type: "text" as const, text: conteudo }] };
  }

  // ── ui_abrir ──

  pi.registerTool({
    name: "ui_abrir",
    label: "UI Abrir",
    description:
      "Abre uma rota do Athlyt em navegador real com sessão autenticada e devolve o " +
      "inventário numerado de elementos (e1..eN) daquela tela. Todas as demais " +
      "ferramentas ui_* referenciam esses identificadores. Exige o dev server no ar.",
    promptSnippet:
      "Open an Athlyt route in a real browser and return a numbered inventory of on-screen elements.",
    promptGuidelines: [
      "Call ui_abrir before any other ui_* tool: the e1..eN identifiers only exist after an observation.",
      "Use ui_verificar before reporting any visual UI/UX problem; a hypothesis that cannot be confirmed with numbers must not become a finding.",
    ],
    parameters: Type.Object({
      rota: Type.String({ description: "Caminho da rota, ex.: /diario/registrar" }),
      viewport: Type.Optional(
        Type.String({
          description: `Nome (${Object.keys(VIEWPORTS_NOMEADOS).join(", ")}) ou "LARGURAxALTURA". Padrão: mobile (390x844).`,
        }),
      ),
      autenticar: Type.Optional(
        Type.Boolean({ description: "Semeia sessão autenticada. Padrão: true." }),
      ),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const viewport = resolverViewport(params.viewport);
      const sessao = await obterSessao(ctx.cwd, viewport, params.autenticar !== false);

      sessao.console.length = 0;
      const url = `${baseUrl()}${params.rota}`;
      const resposta = await sessao.pagina.goto(url, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });

      const nos = (await sessao.pagina.evaluate(
        scriptInventario as unknown as string,
        SELETOR_DE_INTERESSE,
      )) as NoColetado[];

      inventario = numerarInventario(nos.filter((no) => no.visivel));
      rotaAtual = params.rota;

      const destino = new URL(sessao.pagina.url()).pathname;
      const redirecionou = destino !== params.rota ? `\nredirecionado para ${destino}` : "";

      const linhas = inventario.map(
        (item) =>
          `${item.id.padEnd(5)} ${item.papel.padEnd(10)} ${
            item.nome ? `"${item.nome.slice(0, 40)}"` : "(sem nome)"
          } ${Math.round(item.caixa.largura)}×${Math.round(item.caixa.altura)} @ ${Math.round(item.caixa.x)},${Math.round(item.caixa.y)}`,
      );

      return {
        content: [
          {
            type: "text",
            text: [
              `${params.rota} [${resposta?.status() ?? "?"}] — viewport ${viewport.largura}×${viewport.altura}${redirecionou}`,
              `${inventario.length} elementos visíveis:`,
              "",
              ...linhas,
            ].join("\n"),
          },
        ],
        details: { rota: params.rota, viewport, total: inventario.length },
      };
    },
  });

  // ── ui_inspecionar ──

  pi.registerTool({
    name: "ui_inspecionar",
    label: "UI Inspecionar",
    description:
      "Detalha um elemento do inventário: geometria, papel/nome acessível, estilo " +
      "computado, alvo de toque real, hit-test dos cantos e desvio de tokens. " +
      "Responde 'o que é de fato esse elemento que estou vendo'.",
    parameters: Type.Object({
      elemento: Type.String({ description: "Identificador do inventário, ex.: e17" }),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const alvo = exigirElemento(params.elemento);
      const sessao = sessaoAtual();
      if (!sessao) throw new Error("Sessão de navegador encerrada. Chame ui_abrir de novo.");

      const amostras = (await sessao.pagina.evaluate(
        scriptHitTest as unknown as string,
        alvo.seletor,
      )) as { ponto: [number, number]; atingido: string; ehProprio: boolean }[] | null;

      const foco = (await sessao.pagina.evaluate(
        scriptFoco as unknown as string,
        alvo.seletor,
      )) as Parameters<typeof avaliarFoco>[0] | null;

      const toque = avaliarAlvoDeToque(alvo);
      const desvios = avaliarTokens(alvo, escalaDeTokens(ctx.cwd));
      const oclusao = amostras
        ? {
            obstruido: amostras.some((a) => !a.ehProprio),
            pontosLivres: amostras.filter((a) => a.ehProprio).length,
            pontosAmostrados: amostras.length,
            obstrutores: [...new Set(amostras.filter((a) => !a.ehProprio).map((a) => a.atingido))],
          }
        : null;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: alvo.id,
                seletor: alvo.seletor,
                dom: {
                  tag: alvo.tag,
                  papel: alvo.papel,
                  nomeAcessivel: alvo.nome,
                  desabilitado: alvo.desabilitado,
                  tabIndex: alvo.tabIndex,
                  testid: alvo.testid,
                },
                caixa: alvo.caixa,
                estilo: alvo.estilo,
                alvoDeToque: toque,
                oclusao,
                foco: foco ? avaliarFoco(foco) : null,
                desviosDeToken: desvios,
              },
              null,
              2,
            ),
          },
        ],
        details: { elemento: alvo.id },
      };
    },
  });

  // ── ui_interagir ──

  pi.registerTool({
    name: "ui_interagir",
    label: "UI Interagir",
    description:
      "Age sobre um elemento do inventário (clique, digitação, foco, rolagem) e devolve " +
      "a linha do tempo do que mudou depois — primeiro feedback visual, navegação, " +
      "erros de console. Responde 'a interação deu retorno, e em quanto tempo'.",
    parameters: Type.Object({
      elemento: Type.String({ description: "Identificador do inventário, ex.: e17" }),
      acao: StringEnum(["clique", "digitar", "focar", "rolar-ate"] as const),
      valor: Type.Optional(Type.String({ description: "Texto, para a ação digitar." })),
      esperarMs: Type.Optional(
        Type.Number({ description: "Janela de observação após a ação. Padrão: 2000." }),
      ),
    }),
    async execute(_id, params) {
      const alvo = exigirElemento(params.elemento);
      const sessao = sessaoAtual();
      if (!sessao) throw new Error("Sessão de navegador encerrada. Chame ui_abrir de novo.");

      const { pagina } = sessao;
      const localizador = alvo.testid
        ? pagina.getByTestId(alvo.testid)
        : pagina.locator(alvo.seletor).first();

      const urlAntes = pagina.url();
      const htmlAntes = await pagina.evaluate("document.body.innerHTML.length");
      const errosAntes = sessao.console.length;
      const inicio = Date.now();

      switch (params.acao) {
        case "clique":
          await localizador.click({ timeout: 10_000 });
          break;
        case "digitar":
          await localizador.fill(params.valor ?? "", { timeout: 10_000 });
          break;
        case "focar":
          await localizador.focus({ timeout: 10_000 });
          break;
        case "rolar-ate":
          await localizador.scrollIntoViewIfNeeded({ timeout: 10_000 });
          break;
      }
      const tAcao = Date.now() - inicio;

      // Primeira mudança de DOM após a ação: é o que separa "deu
      // feedback" de "o usuário ficou olhando para uma tela parada".
      const primeiraMudanca = await pagina
        .waitForFunction(
          `(tamanho) => document.body.innerHTML.length !== tamanho`,
          htmlAntes,
          { timeout: params.esperarMs ?? 2000, polling: 16 },
        )
        .then(() => Date.now() - inicio)
        .catch(() => null);

      await pagina.waitForTimeout(Math.min(params.esperarMs ?? 2000, 3000));

      const urlDepois = pagina.url();
      const novosErros = sessao.console.slice(errosAntes);

      return texto(
        JSON.stringify(
          {
            elemento: alvo.id,
            acao: params.acao,
            acaoConcluidaEmMs: tAcao,
            primeiraMudancaDeDomEmMs: primeiraMudanca,
            semFeedbackVisivel: primeiraMudanca === null,
            navegou: urlAntes !== urlDepois,
            urlDepois: new URL(urlDepois).pathname,
            errosDeConsole: novosErros,
            avisoInventario:
              urlAntes !== urlDepois
                ? "A tela mudou: o inventário e1..eN está obsoleto, chame ui_abrir."
                : undefined,
          },
          null,
          2,
        ),
      );
    },
  });

  // ── ui_varrer ──

  pi.registerTool({
    name: "ui_varrer",
    label: "UI Varrer",
    description:
      "Roda checagens determinísticas sobre a tela observada: acessibilidade (axe), " +
      "overflow horizontal, oclusão por hit-test, foco visível, desvio dos tokens de " +
      "globals.css, alvo de toque, layout shift e erros de console.",
    parameters: Type.Object({
      checks: Type.Optional(
        Type.Array(StringEnum(CHECKS), {
          description: `Subconjunto de: ${CHECKS.join(", ")}. Padrão: todas.`,
        }),
      ),
    }),
    async execute(_id, params, _signal, onUpdate, ctx) {
      const sessao = sessaoAtual();
      if (!sessao) throw new Error("Nenhuma tela observada. Chame ui_abrir antes de ui_varrer.");
      const pedidos = new Set<string>(params.checks?.length ? params.checks : CHECKS);
      const relatorio: Record<string, unknown> = {};

      if (pedidos.has("acessibilidade")) {
        onUpdate?.({ content: [{ type: "text", text: "axe-core…" }] });
        const fonteAxe = readFileSync(
          join(ctx.cwd, "node_modules/axe-core/axe.min.js"),
          "utf8",
        );
        await sessao.pagina.evaluate(fonteAxe);
        const resultado = (await sessao.pagina.evaluate(
          `axe.run(document, { resultTypes: ["violations"] })`,
        )) as { violations: AxeViolacao[] };
        relatorio.acessibilidade = resultado.violations.map((v) => ({
          regra: v.id,
          impacto: v.impact,
          descricao: v.help,
          nos: v.nodes.slice(0, 5).map((n) => ({
            alvo: n.target.join(" "),
            resumo: n.failureSummary?.split("\n").slice(0, 2).join(" ").slice(0, 200),
          })),
        }));
      }

      if (pedidos.has("overflow")) {
        relatorio.overflow = inventario
          .map((item) => ({ item, r: avaliarOverflow(item, sessao.viewport) }))
          .filter(({ r }) => r.transborda)
          .map(({ item, r }) => ({ elemento: item.id, seletor: item.seletor, ...r }));
      }

      if (pedidos.has("alvo-de-toque")) {
        relatorio["alvo-de-toque"] = inventario
          .filter((item) => ehInterativo(item))
          .map((item) => ({ item, r: avaliarAlvoDeToque(item) }))
          .filter(({ r }) => !r.conforme)
          .map(({ item, r }) => ({
            elemento: item.id,
            nome: item.nome.slice(0, 40),
            largura: r.largura,
            altura: r.altura,
            minimo: r.minimo,
            nota: "Confirme com ui_verificar: um ancestral clicável maior absolve o caso.",
          }));
      }

      if (pedidos.has("tokens")) {
        const escalaAtual = escalaDeTokens(ctx.cwd);
        relatorio.tokens = inventario
          .map((item) => ({ item, v: avaliarTokens(item, escalaAtual) }))
          .filter(({ v }) => v.length > 0)
          .map(({ item, v }) => ({
            elemento: item.id,
            seletor: item.seletor,
            violacoes: v,
          }));
      }

      if (pedidos.has("oclusao")) {
        const achados = [];
        for (const item of inventario.filter(ehInterativo)) {
          const amostras = (await sessao.pagina.evaluate(
            scriptHitTest as unknown as string,
            item.seletor,
          )) as { ponto: [number, number]; atingido: string; ehProprio: boolean }[] | null;
          if (!amostras) continue;
          const obstrutores = [
            ...new Set(amostras.filter((a) => !a.ehProprio).map((a) => a.atingido)),
          ];
          if (obstrutores.length > 0) {
            achados.push({
              elemento: item.id,
              seletor: item.seletor,
              obstrutores,
              pontosLivres: amostras.filter((a) => a.ehProprio).length,
              pontosAmostrados: amostras.length,
            });
          }
        }
        relatorio.oclusao = achados;
      }

      if (pedidos.has("foco")) {
        const achados = [];
        for (const item of inventario.filter(ehInterativo)) {
          const dados = (await sessao.pagina.evaluate(
            scriptFoco as unknown as string,
            item.seletor,
          )) as Parameters<typeof avaliarFoco>[0] | null;
          if (!dados) continue;
          const r = avaliarFoco(dados);
          if (r.focavel && !r.focoVisivel) {
            achados.push({ elemento: item.id, nome: item.nome.slice(0, 40), ...r });
          }
        }
        relatorio.foco = achados;
      }

      if (pedidos.has("layout-shift")) {
        const shifts = (await sessao.pagina.evaluate(scriptLerShifts as unknown as string)) as {
          valor: number;
          instante: number;
          fontes: unknown[];
        }[];
        relatorio["layout-shift"] = {
          cls: Number(shifts.reduce((soma, s) => soma + s.valor, 0).toFixed(4)),
          maiores: shifts.sort((a, b) => b.valor - a.valor).slice(0, 3),
        };
      }

      if (pedidos.has("console")) {
        relatorio.console = sessao.console.slice(0, 20);
      }

      const total = Object.values(relatorio).reduce(
        (soma, valor) => soma + (Array.isArray(valor) ? valor.length : 0),
        0,
      );

      return {
        content: [
          {
            type: "text",
            text: `${rotaAtual} — ${total} achado(s)\n\n${JSON.stringify(relatorio, null, 2)}`,
          },
        ],
        details: { rota: rotaAtual, total },
      };
    },
  });

  // ── ui_verificar ──

  pi.registerTool({
    name: "ui_verificar",
    label: "UI Verificar",
    description:
      "Testa uma hipótese sobre um elemento contra uma regra numérica e devolve " +
      "confirmada, rejeitada ou indeterminada, com a evidência. Use SEMPRE antes de " +
      "relatar um problema visual: rejeita falso positivo como o ícone de 24×24 cujo " +
      "botão tem alvo de 48×48.",
    promptSnippet:
      "Prove or disprove a UI hypothesis about an element with numeric evidence.",
    parameters: Type.Object({
      hipotese: Type.String({ description: "O que você suspeita, em uma frase." }),
      elemento: Type.String({ description: "Identificador do inventário, ex.: e17" }),
      criterio: StringEnum([
        "alvo-de-toque",
        "overflow",
        "oclusao",
        "foco-visivel",
        "tokens",
      ] as const),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const alvo = exigirElemento(params.elemento);
      const sessao = sessaoAtual();
      if (!sessao) throw new Error("Sessão de navegador encerrada. Chame ui_abrir de novo.");

      const criterio = params.criterio as Criterio;

      // O ancestral clicável é o que absolve o falso positivo mais
      // comum; buscá-lo aqui, e não no coletor, mantém a coleta burra.
      let ancestral: { caixa: NoColetado["caixa"] } | undefined;
      if (criterio === "alvo-de-toque") {
        const caixa = (await sessao.pagina.evaluate(
          `(seletor) => {
            const el = document.querySelector(seletor);
            if (!el) return null;
            const clicavel = el.closest("button, a[href], [role=button], [role=link], label, summary, [onclick]");
            if (!clicavel || clicavel === el) return null;
            const r = clicavel.getBoundingClientRect();
            return { x: r.x, y: r.y, largura: r.width, altura: r.height };
          }`,
          alvo.seletor,
        )) as NoColetado["caixa"] | null;
        if (caixa) ancestral = { caixa };
      }

      const amostras =
        criterio === "oclusao"
          ? ((await sessao.pagina.evaluate(
              scriptHitTest as unknown as string,
              alvo.seletor,
            )) as { ponto: [number, number]; atingido: string }[] | null)
          : null;

      const foco =
        criterio === "foco-visivel"
          ? ((await sessao.pagina.evaluate(
              scriptFoco as unknown as string,
              alvo.seletor,
            )) as Parameters<typeof avaliarFoco>[0] | null)
          : null;

      const veredito = verificarHipotese({
        criterio,
        elemento: alvo,
        ancestralClicavel: ancestral,
        viewport: sessao.viewport,
        amostras: amostras?.map((a) => ({ ponto: a.ponto, atingido: a.atingido })),
        foco: foco ?? undefined,
        escala: escalaDeTokens(ctx.cwd),
      });

      return {
        content: [
          {
            type: "text",
            text: [
              `Hipótese: ${params.hipotese}`,
              `Elemento: ${alvo.id} (${alvo.seletor})`,
              `Critério: ${veredito.criterio} — regra ${veredito.regra}`,
              `Status: ${veredito.status.toUpperCase()}`,
              `Motivo: ${veredito.motivo}`,
              "",
              `Evidência: ${JSON.stringify(veredito.evidencia, null, 2)}`,
            ].join("\n"),
          },
        ],
        details: { status: veredito.status, criterio: veredito.criterio },
      };
    },
  });

  // ── Ciclo de vida do navegador ──

  pi.on("session_start", async () => {
    inventario = [];
    rotaAtual = "";
    escala = null;
    await fecharSessao();
  });

  pi.on("session_shutdown", async () => {
    await fecharSessao();
  });
}

type AxeViolacao = {
  id: string;
  impact: string;
  help: string;
  nodes: { target: string[]; failureSummary?: string }[];
};

const PAPEIS_INTERATIVOS = new Set([
  "button",
  "link",
  "checkbox",
  "radio",
  "switch",
  "tab",
  "slider",
  "textbox",
  "combobox",
]);

function ehInterativo(item: ElementoInventariado) {
  return PAPEIS_INTERATIVOS.has(item.papel);
}
