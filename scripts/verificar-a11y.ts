import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { chromium } from "playwright";

/**
 * Portão axe-core de todas as stories do Storybook.
 *
 * O addon-a11y deixa a violação visível no painel, mas o build do Storybook
 * não executa esse painel. Este script usa o mesmo axe-core no iframe de
 * cada story para transformar a auditoria em uma falha determinística do CI.
 */
const BASE = process.env.STORYBOOK_URL ?? "http://localhost:6006";
const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core"), "utf8");

type Entrada = { id: string; type: string; title: string; name: string };
type Violacao = { id: string; impact: string | null; help: string; nodes: { target: string[] }[] };

async function main() {
  const resposta = await fetch(`${BASE}/index.json`);
  if (!resposta.ok) {
    throw new Error(
      `Storybook não respondeu em ${BASE} (HTTP ${resposta.status}).`,
    );
  }

  const { entries } = (await resposta.json()) as {
    entries: Record<string, Entrada>;
  };
  const stories = Object.values(entries).filter((entrada) => entrada.type === "story");
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ viewport: { width: 390, height: 844 } });
  const falhas: string[] = [];

  for (const story of stories) {
    await pagina.goto(`${BASE}/iframe.html?id=${story.id}&viewMode=story`, {
      waitUntil: "networkidle",
    });
    await pagina.addScriptTag({ content: axeSource });

    const violacoes = (await pagina.evaluate(async () => {
      // @ts-expect-error axe é injetado no contexto da página
      const resultado = await window.axe.run("#storybook-root", {
        resultTypes: ["violations"],
      });
      return resultado.violations;
    })) as Violacao[];

    for (const violacao of violacoes) {
      const alvo = violacao.nodes[0]?.target.join(" ") ?? "alvo desconhecido";
      falhas.push(
        `${story.title} / ${story.name}: ${violacao.id} [${violacao.impact ?? "sem impacto"}] — ${violacao.help} (${alvo})`,
      );
    }
  }

  await navegador.close();

  if (falhas.length > 0) {
    console.error(`${falhas.length} violações axe em ${stories.length} stories:`);
    for (const falha of falhas) console.error(`  - ${falha}`);
    process.exit(1);
  }

  console.log(`${stories.length} stories passaram na auditoria axe.`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
