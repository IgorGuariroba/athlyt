import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { config } from "dotenv";

async function silhueta(cor: string) {
  const svg = `<svg width="500" height="800" xmlns="http://www.w3.org/2000/svg"><rect width="500" height="800" fill="#eee"/><circle cx="250" cy="110" r="55" fill="${cor}"/><path d="M170 180 Q250 140 330 180 L370 500 Q330 690 250 730 Q170 690 130 500 Z" fill="${cor}"/></svg>`;
  return sharp(Buffer.from(svg)).webp().toBuffer();
}
async function main() {
  config({ path: ".env" });
  const [{ db }, { users }, { analisarFotosCorporais }] = await Promise.all([import("../src/db/client"), import("../src/db/schema"), import("../src/domain/ia/operacoes/avaliacao-visual")]);
  const email = `visual-real-${randomUUID()}@example.com`; const [usuario] = await db.insert(users).values({ email }).returning();
  try {
    const [frente, costas] = await Promise.all([silhueta("#527a9d"), silhueta("#5f819f")]);
    const entrada = { userId: usuario.id, nucleo: { perfilVersao: 0, modoConservador: true }, fotos: [{ id: randomUUID(), pose: "frente", condicoes: "imagem sintética uniforme", dados: frente, mediaType: "image/webp" }, { id: randomUUID(), pose: "costas", condicoes: "imagem sintética uniforme", dados: costas, mediaType: "image/webp" }], medicoesComparaveis: [] } as const;
    const resultado = await analisarFotosCorporais(entrada);
    if (resultado.status !== "ok") throw new Error("O modelo gratuito não produziu saída estruturada após 3 tentativas.");
    if (resultado.valor.gorduraVisual.maximoPercentual - resultado.valor.gorduraVisual.minimoPercentual < 2) throw new Error("O modelo devolveu percentual exato em vez de faixa.");
    console.log(`Avaliação visual real validada com ${resultado.modeloResolvido}; imagens sintéticas não foram persistidas.`);
  } finally { await db.delete(users).where(eq(users.id, usuario.id)); }
}
main().then(() => process.exit(0)).catch((erro) => { console.error(erro instanceof Error ? erro.message : erro); process.exit(1); });
