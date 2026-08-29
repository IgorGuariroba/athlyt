/**
 * Confere, contra o catálogo do OpenRouter, se o modelo escolhido para
 * cada operação suporta as modalidades que a operação envia.
 *
 * Existe porque o mapa de modelos e o Recorte de Contexto evoluem
 * separadamente: quando um recorte passa a enviar imagem, nada avisa
 * que o modelo daquela operação é só de texto — a falha aparece em
 * produção como "No endpoints found that support image input".
 */
import "./carregar-env";

import { obterRecorte, RECORTES } from "../src/domain/ia/contexto/recortes";
import { modeloDe, type AmbienteIA } from "../src/domain/ia/provedor";
import type { OperacaoIA } from "../src/domain/ia/contexto/tipos";

/** Campos de recorte que carregam imagem ao provedor. */
const CAMPOS_IMAGEM = ["fotos-corporais", "foto-refeicao"];

/** Campos de recorte que carregam áudio ao provedor. */
const CAMPOS_AUDIO = ["audio-refeicao"];

async function catalogo() {
  const chave = process.env.OPENROUTER_API_KEY;
  if (!chave) throw new Error("OPENROUTER_API_KEY não definida");
  const resposta = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${chave}` },
  });
  if (!resposta.ok) throw new Error(`OpenRouter ${resposta.status}`);
  const { data } = (await resposta.json()) as {
    data: {
      id: string;
      architecture?: { input_modalities?: string[] };
      supported_parameters?: string[];
    }[];
  };
  return new Map(data.map((m) => [m.id, m]));
}

async function main() {
  const modelos = await catalogo();
  const ambientes: AmbienteIA[] = ["desenvolvimento", "producao"];
  const falhas: string[] = [];

  for (const ambiente of ambientes) {
    console.log(`\n== ${ambiente} ==`);
    for (const operacao of Object.keys(RECORTES) as OperacaoIA[]) {
      const id = modeloDe(operacao, ambiente);
      const modelo = modelos.get(id);
      const enviaImagem = obterRecorte(operacao).campos.some((c) =>
        CAMPOS_IMAGEM.includes(c.id),
      );
      const enviaAudio = obterRecorte(operacao).campos.some((c) =>
        CAMPOS_AUDIO.includes(c.id),
      );

      if (!modelo) {
        console.log(`  FALHA ${operacao} — ${id} fora do catálogo`);
        falhas.push(`${ambiente}/${operacao}: modelo inexistente`);
        continue;
      }

      const modalidades = modelo.architecture?.input_modalities ?? [];
      const temVisao = modalidades.includes("image");
      const temAudio = modalidades.includes("audio");
      const estruturado = (modelo.supported_parameters ?? []).includes(
        "structured_outputs",
      );

      const problemas: string[] = [];
      if (enviaImagem && !temVisao) problemas.push("recorte envia imagem, modelo é só texto");
      if (enviaAudio && !temAudio) problemas.push("recorte envia áudio, modelo não aceita áudio");
      if (!estruturado) problemas.push("sem structured_outputs");

      const marca = problemas.length === 0 ? "ok  " : "FALHA";
      console.log(
        `  ${marca} ${operacao} — ${id} [${modalidades.join("+") || "?"}]` +
          (problemas.length ? ` — ${problemas.join("; ")}` : ""),
      );
      if (problemas.length) falhas.push(`${ambiente}/${operacao}: ${problemas.join("; ")}`);
    }
  }

  console.log("");
  if (falhas.length) {
    console.error(`FALHOU: ${falhas.length} incompatibilidade(s).`);
    process.exit(1);
  }
  console.log("OK: modelos compatíveis com as modalidades dos recortes.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
