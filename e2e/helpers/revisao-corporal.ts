import { expect, type Page } from "@playwright/test";
import { aguardarHidratacao } from "./hidratacao";

export async function iniciarRevisao(page: Page, recuperacao?: "Baixa") {
  // A tela de Progresso ainda não oferece link para iniciar a Revisão Semanal.
  await page.goto("/progresso/revisao");
  await aguardarHidratacao(page);
  if (recuperacao) await page.getByLabel("Como foi sua recuperação?").selectOption({ label: recuperacao });
  await page.getByRole("button", { name: "Iniciar revisão" }).click();
  await expect(page.getByRole("heading", { name: /Scorecard de progresso/i })).toBeVisible();
  await page.waitForURL("**/progresso/revisao/scorecard");
}

export async function abrirEvidenciasDaRevisao(page: Page) {
  await page.getByRole("link", { name: "Ver evidências" }).click();
  await page.waitForURL("**/progresso/revisao/evidencias");
  await expect(page.getByRole("heading", { name: "Evidências e incertezas" })).toBeVisible();
}

export async function abrirPropostaDaRevisao(page: Page) {
  await page.getByRole("link", { name: "Ver proposta" }).click();
  await page.waitForURL("**/progresso/revisao/proposta");
}

export async function conferirPendenciasDePersonalizacao(
  page: Page,
  pendentes: readonly string[] = ["Simetria bilateral", "Treinamento", "Nutrição"],
) {
  const painel = page.getByRole("main").getByRole("region", { name: "Aprimore sua personalização" });
  await expect(painel).toBeVisible();
  await expect(painel.getByRole("listitem")).toHaveCount(pendentes.length);
  for (const pendencia of [
    { nome: "Simetria bilateral", descricao: /fotos/i, href: "/triagem/avaliacao-corporal" },
    { nome: "Treinamento", descricao: /equipamentos/i, href: "/triagem/academia-equipamentos" },
    { nome: "Nutrição", descricao: /objetivo/i, href: "/triagem/objetivo" },
  ]) {
    if (!pendentes.includes(pendencia.nome)) {
      await expect(painel.getByText(pendencia.nome, { exact: true })).toHaveCount(0);
      continue;
    }
    const item = painel.getByRole("listitem").filter({ has: page.getByText(pendencia.nome, { exact: true }) });
    await expect(item).toContainText(pendencia.descricao);
    await expect(item.getByRole("link")).toHaveAttribute("href", pendencia.href);
    await expect(item.getByRole("link", { name: `Completar: ${pendencia.nome}`, exact: true })).toBeVisible();
  }
  for (const nome of ["Estratégia corporal", "Prioridades musculares", "Saúde e recuperação"]) {
    await expect(painel.getByText(nome, { exact: true })).toHaveCount(0);
  }
  await expect(painel.getByRole("link", { name: "Continuar avaliação", exact: true })).toHaveCount(0);
  await expect(painel.getByRole("button", { name: "Continuar avaliação", exact: true })).toHaveCount(0);
}

export async function abrirPendenciaDeTreinamentoEVoltar(page: Page) {
  await page.getByRole("link", { name: "Completar: Treinamento", exact: true }).click();
  await page.waitForURL("**/triagem/academia-equipamentos");
  await expect(page.getByRole("heading", { name: "Onde você treina?" })).toBeVisible();
  await page.goBack();
  await page.waitForURL("**/treino");
}

export async function conferirPlanoOriginalNoTreino(page: Page) {
  await expect(page).toHaveURL(/\/treino$/);
  await expect(page.getByRole("heading", { name: "Treino", exact: true })).toBeVisible();
  const plano = page.getByRole("main").getByRole("region", { name: "Corpo inteiro", exact: true });
  await expect(plano.getByText("v1", { exact: true })).toBeVisible();
  await expect(plano.getByRole("link", { name: /Corpo inteiro A/ })).toContainText("1 exercícios · 10 séries");
  await expect(page.getByRole("main").getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0);
}

export async function concluirRevisaoEVoltarAoTreino(page: Page) {
  await page.getByRole("link", { name: "Concluir revisão" }).click();
  await page.waitForURL("**/progresso");
  await page.getByRole("link", { name: "Treino", exact: true }).click();
  await page.waitForURL("**/treino");
}
