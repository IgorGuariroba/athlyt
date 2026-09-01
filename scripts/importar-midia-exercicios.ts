import { config } from "dotenv";

/**
 * Ferramenta operacional da Mídia de Execução.
 *
 * --sugerir  lista candidatos da ExerciseDB para cada exercício do
 *            catálogo Athlyt ainda sem mapeamento em MIDIA_EXECUCAO.
 *            Não escreve nada — a curadoria final é manual.
 *
 * --espelhar baixa o GIF de cada entrada já mapeada e grava no R2.
 *            Idempotente (pula o que já existe, salvo --forcar).
 *            Só deve rodar contra produção depois de o licenciamento
 *            da mídia estar confirmado; o script não verifica isso.
 */

async function principal() {
  config({ path: ".env" });

  const modo = process.argv.includes("--espelhar")
    ? "espelhar"
    : process.argv.includes("--sugerir")
      ? "sugerir"
      : null;

  if (!modo) {
    console.error("Uso: tsx scripts/importar-midia-exercicios.ts --sugerir | --espelhar [--forcar]");
    process.exitCode = 1;
    return;
  }

  const { EXERCICIOS } = await import("../src/domain/plano/exercicios");
  const { MIDIA_EXECUCAO } = await import("../src/domain/plano/midia-execucao");
  const { criarClienteExerciseDB } = await import("../src/infra/exercisedb/index");

  if (modo === "sugerir") {
    await sugerir(EXERCICIOS, MIDIA_EXECUCAO, criarClienteExerciseDB());
    return;
  }

  const { configuracaoR2, criarStorageR2 } = await import("../src/infra/storage/index");
  const config2 = configuracaoR2();
  if (!config2) {
    console.error(
      "Cloudflare R2 não configurado. Defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET antes de --espelhar.",
    );
    process.exitCode = 1;
    return;
  }

  await espelhar(MIDIA_EXECUCAO, criarStorageR2(config2), process.argv.includes("--forcar"));
}

async function sugerir(
  catalogo: readonly { id: string; nome: string }[],
  mapaAtual: Record<string, { exerciseId: string }>,
  cliente: { buscar(termo: string, limite?: number): Promise<{ exerciseId: string; nome: string; equipamentos: readonly string[] }[]> },
) {
  const semMapeamento = catalogo.filter((exercicio) => !mapaAtual[exercicio.id]);

  if (semMapeamento.length === 0) {
    console.log("Todos os exercícios do catálogo já têm mídia mapeada.");
    return;
  }

  console.log(`${semMapeamento.length} exercício(s) sem mídia mapeada. Candidatos por busca:\n`);

  for (const exercicio of semMapeamento) {
    console.log(`== ${exercicio.id} (${exercicio.nome})`);
    try {
      const candidatos = await cliente.buscar(exercicio.nome, 5);
      if (candidatos.length === 0) {
        console.log("  (nenhum candidato encontrado — tente um termo em inglês na busca manual)");
      }
      for (const candidato of candidatos) {
        console.log(`  ${candidato.exerciseId} | ${candidato.nome} | ${candidato.equipamentos.join(", ")}`);
      }
    } catch (erro) {
      console.log(`  falha na busca: ${erro instanceof Error ? erro.message : erro}`);
    }
    // Respeita o rate limit do tier gratuito da ExerciseDB.
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  console.log("\nRevise manualmente e adicione as entradas escolhidas em src/domain/plano/midia-execucao.ts.");
}

interface StorageParaEspelhamento {
  existe(chave: string): Promise<boolean>;
  gravar(entrada: { chave: string; corpo: Uint8Array; contentType: string }): Promise<void>;
}

async function espelhar(
  mapa: Record<string, { exerciseId: string; nomeOrigem: string; chaveObjeto: string }>,
  storage: StorageParaEspelhamento,
  forcar: boolean,
) {
  let espelhados = 0;
  let pulados = 0;
  let falhos = 0;

  for (const [exercicioId, midia] of Object.entries(mapa)) {
    if (!forcar && (await storage.existe(midia.chaveObjeto))) {
      console.log(`pulado (já existe): ${exercicioId}`);
      pulados++;
      continue;
    }

    try {
      const gifUrl = `https://static.exercisedb.dev/media/${midia.exerciseId}.gif`;
      const resposta = await fetch(gifUrl);
      if (!resposta.ok) throw new Error(`GET ${gifUrl} → ${resposta.status}`);

      const contentType = resposta.headers.get("content-type") ?? "image/gif";
      if (!contentType.startsWith("image/gif")) throw new Error(`content-type inesperado: ${contentType}`);

      const corpo = new Uint8Array(await resposta.arrayBuffer());
      if (corpo.byteLength === 0) throw new Error("corpo vazio");

      await storage.gravar({ chave: midia.chaveObjeto, corpo, contentType });
      console.log(`espelhado: ${exercicioId} (${midia.chaveObjeto})`);
      espelhados++;
    } catch (erro) {
      console.error(`falhou: ${exercicioId} — ${erro instanceof Error ? erro.message : erro}`);
      falhos++;
    }
  }

  console.log(`\nEspelhados: ${espelhados} · Pulados: ${pulados} · Falhos: ${falhos}`);
  if (falhos > 0) process.exitCode = 1;
}

principal().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
});
