import { expect, type Page } from "@playwright/test";

/**
 * Camada de interação da sessão de treino.
 *
 * Antes destes helpers, o fluxo "iniciar treino → registrar série →
 * concluir" estava copiado em 5 arquivos, e o seletor
 * `input[name="cargaKg"]:not(:disabled)` aparecia 13 vezes. Uma
 * mudança de UI quebrava o E2E em cinco lugares — foi o que aconteceu
 * no PR #38 (docs/memory/mudanca-ui-atualiza-e2e.md). Aqui o contrato
 * com a tela existe uma vez só: renomear um campo é uma correção.
 *
 * Os seletores são de papel/nome acessível de propósito. É o que o
 * atleta enxerga, então o teste quebra quando a experiência muda de
 * verdade — não quando muda uma classe ou a árvore de divs.
 */

/** O diálogo de descanso, que reabre a cada série registrada. */
const timers = (page: Page) =>
  page.getByRole("dialog", { name: "Timer de descanso" });

/**
 * Fecha todo timer aberto.
 *
 * Cada cartão de série monta o próprio diálogo, então pode haver mais
 * de um montado ao mesmo tempo. Fechar um desmonta e recria a lista de
 * cartões, o que invalida qualquer referência capturada antes: por
 * isso buscamos o primeiro diálogo de novo a cada volta, em vez de
 * iterar sobre um `all()`.
 */
export async function fecharTimer(page: Page) {
  for (let tentativa = 0; tentativa < 10; tentativa += 1) {
    const primeiro = timers(page).first();
    if (!(await primeiro.isVisible().catch(() => false))) return;
    await primeiro
      .getByRole("button", { name: "Fechar timer" })
      .click({ force: true });
  }
  await expect(timers(page)).toHaveCount(0);
}

/** Encerra o descanso pelo atalho, quando o teste não quer esperar o relógio. */
export async function pularDescanso(page: Page) {
  await page.getByRole("button", { name: "Pular descanso" }).click();
}

/** Da aba Treino até a prévia do treino prescrito para hoje. */
export async function abrirTreinoDoDia(page: Page) {
  await page.goto("/treino");
  await page.getByRole("link", { name: /Ver treino/ }).click();
}

/** Da prévia até a sessão em andamento. */
export async function iniciarTreino(page: Page) {
  await page.getByRole("button", { name: /Iniciar treino/ }).click();
  await expect(page.getByText("SESSÃO EM ANDAMENTO")).toBeVisible();
}

/** Atalho para os testes que só querem chegar à sessão em andamento. */
export async function abrirSessaoEmAndamento(page: Page) {
  await abrirTreinoDoDia(page);
  await iniciarTreino(page);
}

/**
 * Abre a ficha de um exercício dentro da sessão. Fecha o timer antes:
 * o diálogo da série anterior cobre a lista de exercícios.
 */
export async function abrirExercicio(page: Page, nome: string) {
  await fecharTimer(page);
  const link = page.getByRole("link", { name: `Abrir ${nome}` });
  await expect(link).toBeVisible();
  await link.evaluate((element) => element.scrollIntoView({ block: "center", inline: "nearest" }));
  await link.click();
  await expect(page.getByRole("heading", { name: nome, level: 2 })).toBeVisible();
}

/**
 * Registra uma série: preenche a carga e confirma.
 *
 * `carga` tem padrão porque, na maioria dos cenários, o valor é
 * irrelevante — o que importa é que a série foi registrada. Quem
 * verifica progressão passa o número explicitamente.
 */
export async function registrarSerie(
  page: Page,
  numero: number,
  { carga = "20" }: { carga?: string } = {},
) {
  // O timer da série anterior cobre o formulário e mantém o campo
  // desabilitado enquanto a sincronização corre: fechar primeiro, e só
  // então preencher. Na ordem inversa, `:not(:disabled)` casa no momento
  // da consulta e o elemento é desabilitado antes do `fill`, que então
  // repete "element is not enabled" até estourar o timeout.
  await fecharTimer(page);

  // O formulário da série é a unidade de escopo. Antes, `cargaKg` era
  // buscado com `.first()` na página inteira: com várias séries ou
  // exercícios montados, o teste podia preencher a carga de um
  // formulário e clicar no botão de outro. O `:not(:disabled)`
  // mascarava isso, porque a série já registrada tem o campo
  // desabilitado.
  const formulario = page.locator("form", {
    has: page.getByRole("button", { name: `Registrar série ${numero}` }),
  });
  const botao = formulario.getByRole("button", { name: `Registrar série ${numero}` });
  await expect(botao).toBeEnabled();
  const campo = formulario.locator('input[name="cargaKg"]');
  await expect(campo).toBeEditable();
  await campo.fill(carga);
  // A barra de navegação é fixa no rodapé; centralizar o botão evita que
  // ela intercepte o clique quando o formulário está perto do fim da
  // tela. `scrollIntoViewIfNeeded` respeita o timeout do Playwright,
  // enquanto `evaluate` ficava bloqueado em "waiting for navigation to
  // finish" quando a navegação não concluía.
  await botao.scrollIntoViewIfNeeded();
  await botao.click();
}

/**
 * Conclui o treino.
 *
 * O botão fica atrás do timer que reabre a cada série, e o clique
 * precisa acontecer na janela em que nenhum diálogo está montado.
 * `expect.toPass` faz esse laço com o backoff do próprio Playwright,
 * no lugar de `waitForTimeout(500)` numa contagem fixa de tentativas:
 * a espera cega gastava meio segundo mesmo quando o clique já tinha
 * funcionado, e era metade dos 8,5 s do cenário da navbar.
 */
export async function concluirTreino(
  page: Page,
  { confirmacao = "Treino concluído" }: { confirmacao?: string | RegExp } = {},
) {
  const concluido = page.getByText(confirmacao);
  await expect(async () => {
    await fecharTimer(page);
    await page.getByRole("button", { name: "Concluir treino" }).click();
    await expect(concluido).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
}

/**
 * Conclui esperando o servidor confirmar a série antes.
 *
 * Fechar o timer não implica que a sincronização terminou: o botão
 * *dentro do form* só reaparece quando o POST voltou. Os cenários de
 * substituição dependem dessa ordem, porque verificam o que foi
 * gravado — usar o `concluirTreino` comum aqui esconderia uma corrida.
 */
export async function concluirTreinoSincronizado(
  page: Page,
  { confirmacao = "Treino concluído" }: { confirmacao?: string | RegExp } = {},
) {
  const botao = page.locator("form").getByRole("button", { name: "Concluir treino" });
  await expect(botao).toBeVisible({ timeout: 10_000 });
  await botao.click();
  await expect(page.getByText(confirmacao)).toBeVisible();
}

