/** Sonda real de modalidade + JSON Schema para cada endpoint exato da cadeia v1. */
import "./carregar-env";
import sharp from "sharp";
import { ROTAS_REFEICAO_FOTO } from "../src/domain/ia/provedor";

const BASE = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
const CHAVE = process.env.OPENROUTER_API_KEY;
if (!CHAVE) throw new Error("OPENROUTER_API_KEY não definida");

async function endpointAprovado(modelo: string, tag: string): Promise<string> {
  const [autor, ...slug] = modelo.split("/");
  const resposta = await fetch(`${BASE}/models/${autor}/${slug.join("/")}/endpoints`, {
    headers: { Authorization: `Bearer ${CHAVE}` },
  });
  if (!resposta.ok) throw new Error(`Catálogo de endpoints respondeu HTTP ${resposta.status}`);
  const corpo = await resposta.json() as { data?: { endpoints?: { tag?: string; provider_name?: string; supported_parameters?: string[] }[] } };
  const endpoint = corpo.data?.endpoints?.find((item) => item.tag === tag);
  if (!endpoint) throw new Error(`${modelo}: endpoint ${tag} não está no catálogo`);
  if (!endpoint.supported_parameters?.some((item) => item === "response_format" || item === "structured_outputs")) {
    throw new Error(`${modelo}@${tag}: endpoint não declara saída estruturada`);
  }
  return endpoint.provider_name ?? tag;
}

async function sondar(modelo: string, endpoint: string, imagem: Buffer) {
  const providerName = await endpointAprovado(modelo, endpoint);
  const resposta = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CHAVE}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelo,
      messages: [{ role: "user", content: [
        { type: "text", text: "Qual é a cor predominante? Responda pelo schema." },
        { type: "image_url", image_url: { url: `data:image/webp;base64,${imagem.toString("base64")}` } },
      ] }],
      response_format: {
        type: "json_schema",
        json_schema: { name: "sonda", strict: true, schema: { type: "object", properties: { cor: { type: "string" } }, required: ["cor"], additionalProperties: false } },
      },
      provider: { order: [endpoint], only: [endpoint], allow_fallbacks: false, require_parameters: true },
      reasoning: { effort: "low" },
      max_tokens: 4096,
    }),
  });
  if (!resposta.ok) throw new Error(`${modelo}@${endpoint}: HTTP ${resposta.status}`);
  const corpo = await resposta.json() as { model?: string; provider?: string; choices?: { message?: { content?: string } }[] };
  if (!corpo.model?.startsWith(modelo)) throw new Error(`${modelo}@${endpoint}: modelo resolvido divergiu`);
  if (corpo.provider && corpo.provider !== providerName) throw new Error(`${modelo}@${endpoint}: fornecedor resolvido divergiu`);
  // A sonda existe para validar o que o provedor devolve; o cast declara
  // o que o contrato JSON Schema promete, e o typeof abaixo é o que de
  // fato recusa resposta fora do contrato.
  const objeto = JSON.parse(corpo.choices?.[0]?.message?.content ?? "") as { cor?: unknown };
  if (typeof objeto.cor !== "string" || !objeto.cor) throw new Error(`${modelo}@${endpoint}: JSON Schema não foi respeitado`);
  console.log(`ok ${modelo}@${endpoint}`);
}

async function main() {
  const imagem = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#d04a3a" } }).webp().toBuffer();
  for (const rota of ROTAS_REFEICAO_FOTO) await sondar(rota.modelo, rota.endpoint, imagem);
}

main().then(() => process.exit(0)).catch((erro) => {
  console.error(erro instanceof Error ? erro.message : "Sonda falhou");
  process.exit(1);
});
