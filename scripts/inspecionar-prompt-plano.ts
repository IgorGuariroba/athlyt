/**
 * Dry-run do contexto enviado ao agent na operação `plano-inicial`.
 *
 * Monta exatamente o mesmo Contexto do Atleta que `obterOuGerarRascunhoComIA`
 * monta e imprime o texto renderizado, sem chamar o provedor de IA.
 *
 * Uso: npx tsx scripts/inspecionar-prompt-plano.ts <userId>
 */
import "./carregar-env";

import { desc, eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { profileVersions } from "../src/db/schema";
import { montarNucleo } from "../src/domain/ia/contexto/nucleo";
import { montarContexto, renderizarContexto } from "../src/domain/ia/contexto/montagem";
import { estadoConsentimento } from "../src/domain/ia/consentimento";
import { obterRecorte } from "../src/domain/ia/contexto/recortes";
import { obterPanoramaCorporal } from "../src/domain/medicoes/repositorio";
import type { RespostasTriagem } from "../src/domain/triagem/etapas";
import { montarDadosPlanoInicial } from "../src/domain/ia/operacoes/plano-inicial";

async function main() {
  const userId = process.argv[2];
  if (!userId) throw new Error("informe o userId");

  const [perfil] = await db
    .select()
    .from(profileVersions)
    .where(eq(profileVersions.userId, userId))
    .orderBy(desc(profileVersions.createdAt))
    .limit(1);
  if (!perfil) throw new Error("perfil não encontrado");

  const panorama = await obterPanoramaCorporal(userId);
  // --consentir-tudo simula consentimento vigente sem escrever no banco,
  // para inspecionar o prompt completo quando o recorte mudou de versão.
  const estado = await estadoConsentimento(userId, "plano-inicial");
  const consentimentos = process.argv.includes("--consentir-tudo")
    ? obterRecorte("plano-inicial").campos.map((c) => c.id)
    : estado.vigentes;

  const nucleo = montarNucleo({
    perfilVersao: perfil.version,
    respostas: perfil.respostas as RespostasTriagem,
    respondidoEm: perfil.createdAt,
    agora: new Date(),
  });

  const fotos = consentimentos.includes("fotos-corporais")
    ? [...panorama.fotos]
        .sort((a, b) => b.observadoEm.getTime() - a.observadoEm.getTime())
        .slice(0, 4)
        .map((f) => ({ id: f.id, pose: f.pose, observadoEm: f.observadoEm }))
    : [];

  const contexto = montarContexto({
    operacao: "plano-inicial",
    nucleo,
    consentimentos,
    dados: montarDadosPlanoInicial({
      triagemCompleta: perfil.respostas,
      fotosCorporais: fotos,
      linhaBaseCorporal: {
        medicoes: panorama.medicoes,
        pesos: panorama.pesos,
        gorduras: panorama.gorduras,
        avaliacoesVisuais: panorama.avaliacoesVisuais,
      },
      metasProporcao: panorama.metas,
      historicoImportado: { disponivel: false },
    }),
  });

  console.log(renderizarContexto(contexto));
  console.log("\n--- meta ---");
  console.log("perfilVersao:", perfil.version);
  console.log("consentimentos:", consentimentos.join(", ") || "(nenhum)");
  console.log("camposOmitidos:", contexto.camposOmitidos.join(", ") || "(nenhum)");
  console.log(
    "precisaReconsentir:",
    estado.precisaReconsentir,
    estado.defasados.map((d) => `${d.campo}@v${d.recorteVersao}`).join(", ") || "",
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
