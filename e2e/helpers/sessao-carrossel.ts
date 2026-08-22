import type { Locator, Page } from "@playwright/test";

/**
 * A tela da sessão passou a montar todos os exercícios ao mesmo tempo
 * num carrossel com Scroll Snap (`NavegadorExercicios`). Os cartões fora
 * de foco continuam no DOM — é isso que permite arrastar de um exercício
 * para o outro sem recarregar a rota.
 *
 * Por isso `page.getByLabel("Registrar série 1")` casa com um botão por
 * exercício e viola o strict mode: o rótulo é único dentro do cartão, e
 * não na página. O componente marca os cartões inativos com `inert`, que
 * reflete como atributo e é o discriminador estável para o teste.
 *
 * Toda interação com a sessão deve passar por estes helpers para operar
 * o exercício visível, e não o primeiro do DOM.
 */
export function exercicioAtivo(page: Page): Locator {
  return page.locator('article[data-exercicio-indice]:not([inert])');
}

/**
 * Cartão de um exercício pelo nome visível.
 *
 * Prefira este escopo quando o teste souber o nome: trocar de exercício
 * rola com `behavior: "smooth"` e o `inert` só muda quando o
 * IntersectionObserver reage ao fim da rolagem. Até lá, `exercicioAtivo`
 * ainda aponta para o cartão anterior — cujas séries já foram
 * registradas e cujo botão está `disabled` para sempre. O nome não
 * depende do tempo da animação.
 */
export function exercicioPorNome(page: Page, nome: string): Locator {
  return page
    .locator("article[data-exercicio-indice]")
    .filter({ has: page.getByRole("heading", { name: nome, level: 2 }) });
}

/** Campo de carga do exercício em foco, ignorando séries já registradas. */
export function campoCarga(page: Page): Locator {
  return exercicioAtivo(page)
    .locator('input[name="cargaKg"]:not(:disabled)')
    .first();
}

/** Botão de registrar uma série específica dentro do exercício em foco. */
export function botaoRegistrarSerie(page: Page, numero: number): Locator {
  return exercicioAtivo(page).getByLabel(`Registrar série ${numero}`);
}

/** Preenche a carga e registra a série do exercício em foco. */
export async function registrarSerie(
  page: Page,
  numero: number,
  cargaKg = "20",
): Promise<void> {
  await campoCarga(page).fill(cargaKg);
  await botaoRegistrarSerie(page, numero).click();
}
