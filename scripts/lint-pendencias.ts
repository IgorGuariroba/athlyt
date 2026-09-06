/**
 * Relatório do que ainda está suprimido em `eslint-suppressions.json`.
 *
 * O arquivo de supressões é o inventário da dívida de lint: cada entrada é um
 * achado real que o preset máximo encontrou e que segue pendente. `npm run
 * lint` passa enquanto ele existir, então sem este relatório a dívida fica
 * invisível e nunca é paga.
 *
 * Uso:
 *   npm run lint:pendencias            # resumo por regra
 *   npm run lint:pendencias -- <regra> # arquivos de uma regra específica
 */
import { readFileSync } from "node:fs";

// O `| undefined` no valor é deliberado: sem `noUncheckedIndexedAccess`, o
// TypeScript afirmaria que toda chave existe, e a checagem de regra ausente
// (o caso comum ao filtrar) pareceria código morto para o lint.
type Supressoes = Record<string, Record<string, { count: number } | undefined>>;

const ARQUIVO = "eslint-suppressions.json";

function carregar(): Supressoes {
  try {
    return JSON.parse(readFileSync(ARQUIVO, "utf8")) as Supressoes;
  } catch {
    console.log(`Nenhum ${ARQUIVO}: não há dívida de lint registrada.`);
    process.exit(0);
  }
}

const supressoes = carregar();
const filtro = process.argv[2];

if (filtro) {
  const arquivos = Object.entries(supressoes)
    .map(([arquivo, regras]) => [arquivo, regras[filtro]?.count ?? 0] as const)

    .filter(([, quantidade]) => quantidade > 0)
    .sort((a, b) => b[1] - a[1]);

  const total = arquivos.reduce((soma, [, quantidade]) => soma + quantidade, 0);
  console.log(`${filtro}: ${String(total)} em ${String(arquivos.length)} arquivo(s)\n`);
  for (const [arquivo, quantidade] of arquivos) {
    console.log(`${String(quantidade).padStart(4)}  ${arquivo}`);
  }
  process.exit(0);
}

const porRegra = new Map<string, { total: number; arquivos: number }>();
let total = 0;

for (const regras of Object.values(supressoes)) {
  for (const [regra, entrada] of Object.entries(regras)) {
    if (!entrada) continue;
    const atual = porRegra.get(regra) ?? { total: 0, arquivos: 0 };
    porRegra.set(regra, {
      total: atual.total + entrada.count,
      arquivos: atual.arquivos + 1,
    });
    total += entrada.count;
  }
}

console.log(
  `${String(total)} achados suprimidos em ${String(Object.keys(supressoes).length)} arquivos\n`,
);
for (const [regra, { total: quantidade, arquivos }] of [...porRegra].sort(
  (a, b) => b[1].total - a[1].total,
)) {
  console.log(`${String(quantidade).padStart(4)}  ${regra}  (${String(arquivos)} arquivos)`);
}
console.log(`\nDetalhe de uma regra: npm run lint:pendencias -- <regra>`);
