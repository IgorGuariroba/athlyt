import { expect, test } from "@playwright/test";
import { db } from "@/db/client";
import { plans } from "@/db/schema";
import type { PlanoGerado } from "@/domain/plano/tipos";
import { registrarRespostas } from "@/domain/triagem/perfil";
import type { RespostasTriagem } from "@/domain/triagem/etapas";
import { allowEmail, seedAuthenticatedSession } from "./helpers/seed-session";
import { alternarModoConservador } from "./helpers/preferencias";
import {
  abrirSessaoEmAndamento,
  concluirTreinoSincronizado,
  registrarSerie,
} from "./helpers/sessao";

/**
 * A tela para onde a action manda o atleta mostra o resultado dela.
 *
 * Os dois cenários cobrem os casos que o mapa de invalidação passou a
 * decidir e que antes cada action decidia sozinha — um redirecionando
 * para rota que não invalidava, o outro sem invalidação alguma. Só
 * reproduzem contra o build de produção: em `next dev` o Service
 * Worker está desativado e o defeito é invisível
 * (docs/memory/service-worker-serve-rsc-velho-apos-server-action.md).
 */

const plano: PlanoGerado = {
  regraVersao: "motor-plano-v1", modoConservador: false, perfilVersao: 1, dadosUsados: [],
  nutricao: { calorias: 2400, proteinaG: 160, carboidratosG: 300, gordurasG: 62, fibrasG: 30, estrategia: "Manutenção", refeicoes: [] },
  bloco: { duracaoSemanas: 6, divisao: "Superior / Inferior", dias: [
    { id: "superior-a", nome: "Superior A", diaSemana: "segunda",
      exercicios: [{ exercicioId: "supino-reto-halteres", nome: "Supino reto com halteres", padrao: "empurrar-horizontal", series: 1, repeticoes: "8", rir: 2, descansoSeg: 2, justificativa: "Base de força" }] },
  ] },
};

const respostasCompletas: RespostasTriagem = {
  dataNascimento: "1995-01-01",
  sexoBiologico: "masculino",
  alturaCm: 180,
  pesoKg: 80,
  objetivoComposicao: "ganhar-massa",
  experienciaTreino: "intermediario",
  diasDisponiveis: ["segunda", "quinta"],
  duracaoSessaoMin: 60,
  localTreino: "academia-completa",
  equipamentos: ["halteres", "banco-reto", "elasticos"],
  lesoes: "",
  condicoes: "",
};

test("o resumo traz o treino recém-concluído, não o estado anterior", async ({ page, context }) => {
  const email = `e2e-invalidacao-sessao-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await db.insert(plans).values({ userId: user.id, perfilVersao: 1, versao: 1, estado: "ativo", regraVersao: plano.regraVersao, modoConservador: false, conteudo: plano, activatedAt: new Date() });
  await context.addCookies([cookie]);

  await abrirSessaoEmAndamento(page);
  await registrarSerie(page, 1, { carga: "40" });
  // Sincronizado de propósito: enquanto a série está na fila local a
  // tela oferece o encerramento sem `redirect`, e o cenário precisa
  // justamente do caminho que navega para o resumo.
  await concluirTreinoSincronizado(page);

  // O destino do `redirect` recalcula volume e recordes na leitura: se
  // ele viesse do cache anterior à conclusão, a sessão apareceria sem
  // série alguma.
  await expect(page).toHaveURL(/\/sessao\/[^/]+\/resumo$/);
  await expect(page.getByText("320 kg").first()).toBeVisible();
  await expect(page.getByText("Sem séries registradas")).toHaveCount(0);
});

test("desligar e ligar o Modo Conservador vale na aba Treino imediatamente", async ({ page, context }) => {
  const email = `e2e-invalidacao-conservador-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await registrarRespostas(user.id, respostasCompletas);
  await context.addCookies([cookie]);

  // Perfil completo e sem plano: a aba Treino convida a gerar o plano.
  await page.goto("/treino");
  await expect(page.getByText("Seu perfil está pronto")).toBeVisible();

  // O Modo Conservador sem Plano Ativo devolve o atleta à cascata: a
  // escrita acontece em /mais e o leitor é outra aba. `/triagem`
  // reencaminha para a próxima etapa pendente, então o que se afirma é
  // ter caído na cascata, não a etapa exata.
  await alternarModoConservador(page, true);
  await page.goto("/treino");
  await expect(page).toHaveURL(/\/triagem(\/|\?|$)/);

  await alternarModoConservador(page, false);
  await page.goto("/treino");
  await expect(page.getByText("Seu perfil está pronto")).toBeVisible();
});
