import type { Page } from "@playwright/test";

/**
 * Espera o React assumir o formulário antes de submetê-lo.
 *
 * Um `<form action={serverAction}>` existe no HTML antes da hidratação,
 * e o Playwright o considera clicável nesse estado. O clique vira POST
 * nativo, mas a Server Action responde `303` com `text/x-component` e
 * sem `Location` — payload que só o Router do Next sabe interpretar. O
 * navegador não tem para onde ir, a página fica onde estava, e o teste
 * falha etapas adiante esperando a tela seguinte.
 *
 * O sintoma é sensível a máquina: no runner do CI, mais lento, o clique
 * cabe na janela entre o `load` e a hidratação; localmente ela quase
 * nunca abre. Por isso a falha alternava de cenário a cada execução
 * (docs/memory/e2e-flaky-sorteia-cenarios-diferentes.md).
 *
 * `waitForFunction` observa o próprio efeito da hidratação — o React
 * anexa a propriedade interna ao nó — em vez de dormir um tempo fixo,
 * então a espera termina assim que a condição ocorre.
 */
export async function aguardarHidratacao(page: Page) {
  await page.waitForFunction(() => {
    const form = document.querySelector("form");
    if (!form) return true;
    return Object.keys(form).some((chave) => chave.startsWith("__react"));
  });
}
