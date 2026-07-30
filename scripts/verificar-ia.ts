/**
 * Verificação de integração real com o OpenRouter.
 *
 * Os testes unitários usam mock e por isso não provam três coisas que
 * só falham em rede: se o modelo do catálogo existe, se
 * `providerOptions` chega ao OpenRouter intacto e se o roteamento
 * respeita saída estruturada.
 *
 * Uso (usa o catálogo :free por padrão):
 *   npx tsx scripts/verificar-ia.ts
 *   IA_AMBIENTE=producao npx tsx scripts/verificar-ia.ts
 */
import { config } from "dotenv";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  ambienteIA,
  modeloDe,
  openrouter,
  OPCOES_PROVEDOR,
} from "../src/domain/ia/provedor";
import { montarNucleo } from "../src/domain/ia/contexto/nucleo";
import {
  montarContexto,
  renderizarContexto,
} from "../src/domain/ia/contexto/montagem";

config({ path: ".env" });

const schema = z.object({
  cargaSugeridaKg: z.number().nullable(),
  justificativa: z.string(),
});

async function main() {
  const ambiente = ambienteIA();
  const modelo = modeloDe("copiloto-sessao", ambiente);

  console.log(`Ambiente: ${ambiente}`);
  console.log(`Modelo solicitado: ${modelo}\n`);

  const nucleo = montarNucleo({
    perfilVersao: 1,
    respostas: {
      dataNascimento: "1995-03-10",
      sexoBiologico: "masculino",
      alturaCm: 178,
      pesoKg: 82,
      objetivoConfirmado: true,
      experienciaTreino: "intermediario",
      diasDisponiveis: ["segunda", "quarta", "sexta"],
      duracaoSessaoMin: 60,
      localTreino: "academia-completa",
      equipamentos: ["Barra e anilhas", "Halteres"],
      lesoes: "",
    },
    respondidoEm: new Date(),
    agora: new Date(),
  });

  const contexto = montarContexto({
    operacao: "copiloto-sessao",
    nucleo,
    dados: {
      exercicio: {
        nome: "Supino reto com barra",
        seriesHoje: [{ cargaKg: 60, repeticoes: 10, rir: 2 }],
        serieAtual: 2,
        totalSeries: 4,
      },
    },
    consentimentos: [],
  });

  const resposta = await generateText({
    model: openrouter().chatModel(modelo),
    output: Output.object({ schema }),
    system:
      "Você é o Copiloto de Sessão. Sugira a carga da próxima série. " +
      "Se não houver base, devolva null em vez de inventar.",
    prompt: renderizarContexto(contexto),
    providerOptions: OPCOES_PROVEDOR,
  });

  const modeloResolvido = resposta.response.modelId;

  console.log("Saída estruturada:", resposta.output);
  console.log(`\nModelo resolvido: ${modeloResolvido || "(não informado)"}`);

  if (!modeloResolvido) {
    console.error(
      "\nFALHA: provedor não identificou o modelo. A ADR 0005 trata " +
        "essa resposta como não auditável — a Trilha de Decisão fica sem " +
        "o dado que torna a decisão reproduzível.",
    );
    process.exit(1);
  }

  if (modeloResolvido.replace(/:free$/, "") !== modelo.replace(/:free$/, "")) {
    console.error(
      `\nFALHA: modelo resolvido (${modeloResolvido}) difere do solicitado ` +
        `(${modelo}). Indica que allow_fallbacks não foi respeitado — o ` +
        "consentimento apresentado ao usuário citaria o provedor errado.",
    );
    process.exit(1);
  }

  console.log("\nOK: saída estruturada válida e roteamento sem fallback.");
}

main().catch((erro) => {
  console.error("\nFALHA:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
