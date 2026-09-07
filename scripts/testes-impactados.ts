import { executarSelecao } from "./seletor-testes";

const baseIndice = process.argv.indexOf("--base");
const headIndice = process.argv.indexOf("--head");
const base = baseIndice >= 0 ? process.argv[baseIndice + 1] : undefined;
const head = headIndice >= 0 ? process.argv[headIndice + 1] : undefined;

if (base === undefined || head === undefined) {
  throw new Error("uso: tsx scripts/testes-impactados.ts --base <sha> --head <sha>");
}

executarSelecao(base, head);
