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

interface Entrada { id: string; type: string; title: string; name: string }
interface Violacao { id: string; impact: string | null; help: string; nodes: { target: string[] }[] }

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
      // `axe` é injetado na página pelo `addScriptTag` acima; o tipo do
      // axe-core existe só aqui dentro, onde não colide com o bundle do
      // Node. Sem a guarda, um axe não injetado viraria TypeError sem
      // dizer em qual story aconteceu.
      const axe = (window as unknown as { axe?: { run: typeof import("axe-core").run } }).axe;
      if (!axe) throw new Error("axe-core não foi injetado na página");
      const resultado = await axe.run("#storybook-root", {
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

main().catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
});
