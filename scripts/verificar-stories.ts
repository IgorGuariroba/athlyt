import { chromium } from "playwright";

/**
 * Smoke de renderização de todas as stories do Storybook.
 *
 * `storybook build` compila; não renderiza. A distinção não é acadêmica:
 * um componente que chama `useRouter` sem o App Router montado compila
 * sem reclamar e quebra em tempo de execução — e o Storybook captura
 * esse erro na moldura dele, então a story aparece apenas **vazia**, sem
 * nada no console do build. Foi assim que `EnvioFotos` passou por um
 * build verde estando quebrada.
 *
 * Por isso a asserção aqui é dupla: nenhum erro de página **e** altura
 * renderizada acima de zero. Uma story que não desenha nada não está
 * demonstrando nada, que é o único motivo de a galeria existir.
 *
 * Roda contra um Storybook já no ar (`npm run storybook`) ou contra o
 * estático servido em qualquer porta, via STORYBOOK_URL.
 */
const BASE = process.env.STORYBOOK_URL ?? "http://localhost:6006";

type Entrada = { id: string; type: string; title: string; name: string };

async function main() {
  const resposta = await fetch(`${BASE}/index.json`);
  if (!resposta.ok) {
    throw new Error(
      `Storybook não respondeu em ${BASE} (HTTP ${resposta.status}). Suba com "npm run storybook".`,
    );
  }
  const { entries } = (await resposta.json()) as {
    entries: Record<string, Entrada>;
  };
  const stories = Object.values(entries).filter((e) => e.type === "story");

  const navegador = await chromium.launch();
  // Mesmo viewport da auditoria visual: o Athlyt é um produto mobile.
  const pagina = await navegador.newPage({
    viewport: { width: 390, height: 844 },
  });

  const falhas: string[] = [];
  for (const story of stories) {
    const erros: string[] = [];
    pagina.removeAllListeners("pageerror");
    pagina.on("pageerror", (e) => erros.push(String(e)));

    await pagina.goto(`${BASE}/iframe.html?id=${story.id}&viewMode=story`, {
      waitUntil: "networkidle",
    });

    const raiz = await pagina.$("#storybook-root");
    const caixa = raiz ? await raiz.boundingBox() : null;
    const altura = caixa?.height ?? 0;

    if (erros.length > 0) {
      falhas.push(`${story.title} / ${story.name}: ${erros[0].split("\n")[0]}`);
    } else if (altura < 4) {
      falhas.push(
        `${story.title} / ${story.name}: renderizou vazia (altura ${altura}px)`,
      );
    }
  }

  await navegador.close();

  if (falhas.length > 0) {
    console.error(`${falhas.length} de ${stories.length} stories com problema:`);
    for (const falha of falhas) console.error(`  - ${falha}`);
    process.exit(1);
  }
  console.log(`${stories.length} stories renderizaram sem erro.`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
