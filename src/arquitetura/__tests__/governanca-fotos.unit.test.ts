import { describe, expect, it } from "vitest";
import { arquivosQueExibemObjectKey } from "../governanca-fotos";

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
});
