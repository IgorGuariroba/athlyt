/**
 * Verificação de integração real com o OpenRouter.
 *
 * Os testes unitários usam mock e por isso não provam o que só falha
 * em rede e banco: se o modelo do catálogo existe, se
 * `providerOptions` chega ao OpenRouter intacto, se o roteamento
 * respeita saída estruturada e se a Trilha de Decisão é de fato
 * gravada com o modelo resolvido.
 *
 * Exercita o executor `decidir()` inteiro — o mesmo caminho que a
 * aplicação usa — e não uma chamada paralela que poderia divergir
 * dele sem ninguém notar.
 *
 * Uso (usa o catálogo :free por padrão):
 *   npm run ia:verificar
 *   IA_AMBIENTE=producao npm run ia:verificar
 *
 * Cria um usuário descartável, grava a trilha e apaga tudo no fim.
 */
import "./carregar-env";

import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { users } from "../src/db/schema";
import { montarNucleo } from "../src/domain/ia/contexto/nucleo";
import { obterRecorte } from "../src/domain/ia/contexto/recortes";
import { conceder, consentimentosVigentes } from "../src/domain/ia/consentimento";
import { orientarProximaSerie } from "../src/domain/ia/operacoes/copiloto-sessao";
import { ambienteIA, modeloDe, NOME_PROVEDOR } from "../src/domain/ia/provedor";
import { listarTrilhas } from "../src/domain/ia/trilha";
import type { DiaSemana } from "../src/domain/triagem/etapas";

const RESPOSTAS = {
  dataNascimento: "1995-03-10",
  sexoBiologico: "masculino" as const,
  alturaCm: 178,
  pesoKg: 82,
  objetivoConfirmado: true,
  experienciaTreino: "intermediario" as const,
  diasDisponiveis: ["segunda", "quarta", "sexta"] as DiaSemana[],
  duracaoSessaoMin: 60,
  localTreino: "academia-completa" as const,
  equipamentos: ["Barra e anilhas", "Halteres"],
  lesoes: "",
};

const EXERCICIO = {
  nome: "Supino reto com barra",
  seriesHoje: [{ cargaKg: 60, repeticoes: 10, rir: 2 }],
  serieAtual: 2,
  totalSeries: 4,
};

const PRONTIDAO = {
  energia: 3,
  sono: 7,
  fadiga: 2,
  dores: "leve desconforto no ombro direito",
  motivacao: 4,
};

const falhas: string[] = [];

function verificar(condicao: boolean, descricao: string, detalhe = "") {
  if (condicao) {
    console.log(`  ok   ${descricao}`);
  } else {
    console.log(`  FALHA ${descricao}${detalhe ? ` — ${detalhe}` : ""}`);
    falhas.push(descricao);
  }
}

async function main() {
  const ambiente = ambienteIA();
  const modeloSolicitado = modeloDe("copiloto-sessao", ambiente);

  console.log(`Ambiente: ${ambiente}`);
  console.log(`Modelo solicitado: ${modeloSolicitado}\n`);

  const [usuario] = await db
    .insert(users)
    .values({ email: `verificar-ia-${crypto.randomUUID()}@example.com` })
    .returning();

  try {
    const nucleo = montarNucleo({
      perfilVersao: 1,
      respostas: RESPOSTAS,
      respondidoEm: new Date(),
      agora: new Date(),
    });

    // --- 1. Sem consentimento: o dado sensível não pode ser enviado ---
    console.log("1. Chamada sem consentimento (deve degradar, não omitir em silêncio)");

    const semConsentimento = await orientarProximaSerie({
      userId: usuario.id,
      nucleo,
      consentimentos: await consentimentosVigentes(usuario.id, "copiloto-sessao"),
      exercicio: EXERCICIO,
      prontidaoHoje: PRONTIDAO,
    });

    verificar(
      semConsentimento.contexto.camposOmitidos.includes("prontidao-hoje"),
      "prontidão omitida por falta de consentimento",
      JSON.stringify(semConsentimento.contexto.camposOmitidos),
    );
    verificar(
      semConsentimento.contexto.degradado,
      "contexto marcado como degradado",
    );
    verificar(
      semConsentimento.status === "ok",
      "decisão ainda assim produzida (degrada, não bloqueia)",
      semConsentimento.status === "indisponivel"
        ? semConsentimento.motivo
        : "",
    );

    // --- 2. Com consentimento: o dado sensível é enviado ---
    console.log("\n2. Chamada com consentimento concedido");

    await conceder(
      usuario.id,
      "copiloto-sessao",
      ["prontidao-hoje"],
      NOME_PROVEDOR,
    );

    const consentimentos = await consentimentosVigentes(
      usuario.id,
      "copiloto-sessao",
    );
    verificar(
      consentimentos.includes("prontidao-hoje"),
      "consentimento persistido e lido de volta",
    );

    const comConsentimento = await orientarProximaSerie({
      userId: usuario.id,
      nucleo,
      consentimentos,
      exercicio: EXERCICIO,
      prontidaoHoje: PRONTIDAO,
      historicoExercicio: [
        { data: "2026-07-23", melhorSerie: { cargaKg: 57.5, repeticoes: 10, rir: 2 } },
      ],
    });

    if (comConsentimento.status !== "ok") {
      verificar(false, "decisão produzida", comConsentimento.motivo);
    } else {
      verificar(!comConsentimento.degradado, "contexto completo, sem degradação");
      verificar(
        comConsentimento.modeloResolvido === modeloSolicitado,
        "modelo resolvido igual ao solicitado (allow_fallbacks respeitado)",
        `resolvido=${comConsentimento.modeloResolvido}`,
      );
      verificar(
        typeof comConsentimento.valor.justificativa === "string" &&
          comConsentimento.valor.justificativa.length > 0,
        "saída estruturada válida contra o schema",
      );
      console.log("\n  Orientação:", JSON.stringify(comConsentimento.valor, null, 2));
    }

    // --- 3. Trilha de Decisão gravada nos dois casos ---
    console.log("\n3. Trilha de Decisão");

    const trilhas = await listarTrilhas(usuario.id);
    verificar(
      trilhas.length === 2,
      "uma trilha por chamada, inclusive a degradada",
      `gravadas=${trilhas.length}`,
    );

    const [maisRecente, maisAntiga] = trilhas;

    verificar(
      maisRecente?.auditavel === true,
      "decisão marcada como auditável (modelo identificado)",
    );
    verificar(
      maisRecente?.modeloResolvido === modeloSolicitado,
      "trilha registra o modelo resolvido, não o nome lógico",
      `${maisRecente?.modeloResolvido}`,
    );
    verificar(
      maisRecente?.recorteVersao === obterRecorte("copiloto-sessao").versao,
      "trilha registra a versão do recorte usada",
    );
    verificar(
      Array.isArray(maisRecente?.camposEnviados) &&
        (maisRecente.camposEnviados as string[]).includes("prontidao-hoje"),
      "trilha lista o campo sensível como enviado quando houve consentimento",
      JSON.stringify(maisRecente?.camposEnviados),
    );
    verificar(
      Array.isArray(maisAntiga?.camposOmitidos) &&
        (maisAntiga.camposOmitidos as string[]).includes("prontidao-hoje"),
      "trilha da chamada sem consentimento registra a omissão",
      JSON.stringify(maisAntiga?.camposOmitidos),
    );
  } finally {
    await db.delete(users).where(eq(users.id, usuario.id));
  }

  console.log("");
  if (falhas.length > 0) {
    console.error(`FALHOU: ${falhas.length} verificação(ões).`);
    process.exit(1);
  }
  console.log("OK: integração, consentimento e Trilha de Decisão verificados.");
  process.exit(0);
}

main().catch((erro) => {
  console.error("\nFALHA:", erro instanceof Error ? erro.stack : erro);
  process.exit(1);
});
