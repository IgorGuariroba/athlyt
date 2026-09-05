import "./carregar-env";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { seedAuthenticatedSession, allowEmail } from "../e2e/helpers/seed-session";

/**
 * Captura uma screenshot de cada tela do produto para auditoria visual
 * contra as referências do MacroFactor
 * (`workflow-imagens-references/macrofactor/`).
 *
 * Existe como script, e não como teste E2E, porque o objetivo é
 * produzir evidência para leitura humana/agente — não afirmar um
 * invariante. Roda contra o dev server já no ar.
 *
 * Viewport de 390×844 (iPhone 14) para que a densidade seja comparável
 * à das capturas de referência, todas de um iPhone em retrato.
 */
const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
const SAIDA = "evidencias-e2e/auditoria";

/**
 * Telas sem sessão.
 *
 * A galeria do design system saiu desta lista ao virar Storybook: ela
 * não é mais uma rota do produto, e capturar componentes isolados nunca
 * foi o objetivo aqui — a auditoria compara *telas* com as referências
 * do MacroFactor.
 */
const PUBLICAS = [
  ["boas-vindas", "/"],
  ["acesso-restrito", "/acesso-restrito"],
] as const;

/** Telas do casco autenticado e da cascata de triagem. */
const AUTENTICADAS = [
  ["triagem-intro", "/triagem"],
  ["triagem-sexo", "/triagem/sexo"],
  ["triagem-idade", "/triagem/idade"],
  ["triagem-altura", "/triagem/altura"],
  ["triagem-peso", "/triagem/peso"],
  ["triagem-objetivo", "/triagem/objetivo"],
  ["triagem-experiencia", "/triagem/experiencia"],
  ["triagem-disponibilidade", "/triagem/disponibilidade"],
  ["triagem-duracao-sessao", "/triagem/duracao-sessao"],
  ["triagem-academia-equipamentos", "/triagem/academia-equipamentos"],
  ["triagem-alimentacao-logistica", "/triagem/alimentacao-logistica"],
  ["triagem-alimentacao-restricoes", "/triagem/alimentacao-restricoes"],
  ["triagem-rotina-sono", "/triagem/rotina-sono"],
  ["triagem-saude-condicoes", "/triagem/saude-condicoes"],
  ["triagem-saude-lesoes", "/triagem/saude-lesoes"],
  ["triagem-avaliacao-corporal", "/triagem/avaliacao-corporal"],
  ["triagem-avaliacao-essenciais", "/triagem/avaliacao-corporal/essenciais"],
  ["triagem-avaliacao-completas", "/triagem/avaliacao-corporal/completas"],
  ["triagem-avaliacao-gordura", "/triagem/avaliacao-corporal/gordura"],
  ["triagem-avaliacao-fotos", "/triagem/avaliacao-corporal/fotos"],
  ["triagem-resumo", "/triagem/resumo"],
  ["plano-revisao", "/plano/revisao"],
  ["plano-revisao-treino", "/plano/revisao/treino"],
  ["plano-revisao-nutricao", "/plano/revisao/nutricao"],
  ["app-inicio", "/inicio"],
  ["app-diario", "/diario"],
  ["app-diario-registrar", "/diario/registrar"],
  ["app-diario-medicoes", "/diario/medicoes"],
  ["app-progresso", "/progresso"],
  ["app-progresso-fotos", "/progresso/fotos"],
  ["app-progresso-avaliacao-visual", "/progresso/avaliacao-visual"],
  ["app-progresso-revisao", "/progresso/revisao"],
  ["app-progresso-revisao-scorecard", "/progresso/revisao/scorecard"],
  ["app-progresso-revisao-evidencias", "/progresso/revisao/evidencias"],
  ["app-progresso-revisao-proposta", "/progresso/revisao/proposta"],
  ["app-progresso-revisao-experimento", "/progresso/revisao/experimento"],
  ["app-sessao-historico", "/sessao/historico"],
  ["app-mais", "/mais"],
  ["app-mais-trilhas", "/mais/trilhas"],
  ["app-mais-consentimentos", "/mais/consentimentos"],
  ["app-mais-sincronizacao", "/mais/sincronizacao"],
] as const;

async function main() {
  await mkdir(SAIDA, { recursive: true });

  const email = `auditoria-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie } = await seedAuthenticatedSession(email);

  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await contexto.addCookies([cookie]);
  const pagina = await contexto.newPage();

  const falhas: string[] = [];

  for (const [nome, rota] of [...PUBLICAS, ...AUTENTICADAS]) {
    try {
      const resposta = await pagina.goto(`${BASE}${rota}`, {
        waitUntil: "networkidle",
        timeout: 20_000,
      });
      // `fullPage` porque a comparação é de composição inteira: cortar
      // na dobra esconderia justamente o rodapé e o CTA fixo.
      await pagina.screenshot({
        path: `${SAIDA}/${nome}.png`,
        fullPage: true,
      });
      const destino = new URL(pagina.url()).pathname;
      const redirecionou = destino !== rota ? ` (redirect -> ${destino})` : "";
      console.log(`ok   ${nome} [${String(resposta?.status() ?? 0)}]${redirecionou}`);
    } catch (erro) {
      falhas.push(nome);
      console.log(`FALHA ${nome}: ${(erro as Error).message.split("\n")[0]}`);
    }
  }

  await navegador.close();
  console.log(`\n${falhas.length} falha(s). Saída em ${SAIDA}/`);
  process.exit(0);
}

main().catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
});
