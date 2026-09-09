import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { arquivosQueExibemObjectKey } from "../governanca-fotos";

function arquivosDeFonte(cwd: string) {
  const resultado: { caminho: string; fonte: string }[] = [];
  const visitar = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name);
      if (entrada.isDirectory()) visitar(caminho);
      else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entrada.name) && !/\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entrada.name)) resultado.push({ caminho: caminho.slice(cwd.length + 1).replaceAll("\\", "/"), fonte: readFileSync(caminho, "utf8") });
    }
  };
  visitar(join(cwd, "src/app"));
  visitar(join(cwd, "scripts"));
  return resultado;
}

describe("governança do ciclo de vida de fotos", () => {
  it("não permite chave física em actions ou scripts", () => {
    expect(arquivosQueExibemObjectKey([
      { caminho: "src/app/fotos/actions.ts", fonte: "const foto = item.objectKey" },
      { caminho: "scripts/retencao.ts", fonte: "storage.excluir(foto.objectKey)" },
    ])).toEqual([
      "src/app/fotos/actions.ts conhece objectKey: use a interface do ciclo de vida de fotos",
      "scripts/retencao.ts conhece objectKey: use a interface do ciclo de vida de fotos",
    ]);
  });

  it("não encontra referências reais fora do domínio", () => {
    expect(arquivosQueExibemObjectKey(arquivosDeFonte(process.cwd()))).toEqual([]);
  });
});
