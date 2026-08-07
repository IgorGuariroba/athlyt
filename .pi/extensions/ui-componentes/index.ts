/**
 * Extensão de governança de interface do Athlyt.
 *
 * Duas superfícies:
 *
 * 1. **Ferramenta `ui_catalogo`** — expõe o catálogo de componentes
 *    (primitivos shadcn, composição de tela, navegação) para o agente
 *    consultar antes de escrever qualquer arquivo de interface.
 *
 * 2. **Interceptação de `write`** — arquivos de página (src/app/**)
 *    são verificados contra as regras do MacroFactor Visual System
 *    (DESIGN.md) e contra o catálogo. Se a página usa controle cru, cor
 *    literal, sombra, tipografia genérica do Tailwind, a escrita é
 *    bloqueada com diagnóstico.
 *
 * O bloco é aplicado somente a arquivos de página; o catálogo em
 * `src/components/**` e arquivos de teste podem receber primitivos.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { lerCatalogo, resumirCatalogo, type ComponenteCatalogo } from "./catalogo";
import {
  verificarConteudo,
  formatarViolacoes,
  ehArquivoDeInterface,
  ehComponenteDoCatalogo,
} from "./regras";

export default function extensaoUiComponentes(pi: ExtensionAPI) {
  let catalogoCache: ComponenteCatalogo[] | null = null;
  let catalogoTxt: string | null = null;

  function garantirCatalogo(cwd: string) {
    if (!catalogoCache) {
      catalogoCache = lerCatalogo(cwd);
      catalogoTxt = resumirCatalogo(catalogoCache);
    }
    return { componentes: catalogoCache, resumo: catalogoTxt! };
  }

  // ── Ferramenta: catálogo ──

  pi.registerTool({
    name: "ui_catalogo",
    label: "Catálogo UI",
    description:
      "Lista os componentes de interface do projeto Athlyt (primitivos shadcn, " +
      "composição de tela e navegação). Use ANTES de escrever qualquer arquivo " +
      "em src/app/ para reutilizar componentes existentes e respeitar o " +
      "MacroFactor Visual System (DESIGN.md).",
    promptSnippet:
      "List UI components available in the Athlyt project (shadcn primitives, " +
      "screen composition, navigation) before writing any page.",
    promptGuidelines: [
      "Call ui_catalogo before writing or editing any file under src/app/.",
      "Prefer reusing catalog components over raw HTML controls. If a needed variant is missing, extend the component in src/components/ so every screen benefits, then use it.",
      "Never write literal hex colors, Tailwind shadows, or raw Tailwind font-size utilities in page files. Use project tokens from globals.css.",
    ],
    parameters: Type.Object({
      filtro: Type.Optional(
        Type.String({ description: "Termo para filtrar componentes pelo nome." }),
      ),
      ver: Type.Optional(
        Type.String({
          description: "Caminho de import para inspecionar exports e variantes de um componente.",
        }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const { componentes, resumo } = garantirCatalogo(ctx.cwd);

      if (params.ver) {
        const alvo = componentes.find(
          (c) => c.importPath === params.ver || c.importPath.endsWith("/" + params.ver),
        );
        if (!alvo) {
          return {
            content: [
              {
                type: "text",
                text: `Componente "${params.ver}" não encontrado no catálogo.\n\nCatálogo:\n${resumo}`,
              },
            ],
          };
        }
        const variantes = Object.entries(alvo.variantes)
          .map(([grupo, opcoes]) => `  ${grupo}: ${opcoes.join(" | ")}`)
          .join("\n");
        return {
          content: [
            {
              type: "text",
              text: [
                `**${alvo.exports.join(", ")}** — \`${alvo.importPath}\``,
                alvo.doc ? `\n${alvo.doc}` : "",
                variantes ? `\n\nVariantes:\n${variantes}` : "",
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        };
      }

      if (params.filtro) {
        const termo = params.filtro.toLowerCase();
        const encontrados = componentes.filter(
          (c) =>
            c.exports.some((nome) => nome.toLowerCase().includes(termo)) ||
            c.importPath.toLowerCase().includes(termo) ||
            c.camada.toLowerCase().includes(termo),
        );
        if (encontrados.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Nenhum componente com "${params.filtro}". Catálogo completo:\n\n${resumo}`,
              },
            ],
          };
        }
        return {
          content: [
            { type: "text", text: resumirCatalogo(encontrados) },
          ],
        };
      }

      return { content: [{ type: "text", text: resumo }] };
    },
  });

  // ── Gancho: bloquear escrita fora do catálogo ──

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "write") return;
    const input = event.input as { path?: string; content?: string };
    const caminho = input.path;
    if (!caminho) return;

    // Apenas arquivos de página → src/app/**
    if (!ehArquivoDeInterface(caminho)) return;
    // Nunca bloquear o próprio catálogo
    if (ehComponenteDoCatalogo(caminho)) return;

    const conteudo = input.content ?? "";
    const violacoes = verificarConteudo(conteudo);
    if (violacoes.length === 0) return;

    // Mostra diagnóstico no TUI sem bloquear a execução — a ferramenta
    // em si roda; o agente vê a notificação e usa ui_catalogo.
    ctx.ui.notify(
      `write bloqueado em ${caminho}: ${violacoes.length} violações de interface`,
      "warning",
    );

    return {
      block: true,
      reason: formatarViolacoes(caminho, violacoes),
    };
  });

  // ── Recarrega catálogo a cada nova sessão ──

  pi.on("session_start", (_event, ctx) => {
    catalogoCache = null;
    catalogoTxt = null;
    garantirCatalogo(ctx.cwd);
  });
}
