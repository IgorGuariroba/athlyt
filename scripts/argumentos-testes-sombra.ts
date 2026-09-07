export function parsearArgumentosSombra(args: string[]): { base: string; head: string; output: string } {
  const valores = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const valor = args[i + 1];
    if (flag === undefined || !["--base", "--head", "--output"].includes(flag)) {
      throw new Error(`argumento desconhecido: ${flag ?? ""}`);
    }
    if (valores.has(flag)) throw new Error(`argumento repetido: ${flag}`);
    if (valor === undefined || valor.length === 0 || valor.startsWith("--")) {
      throw new Error(`valor ausente para ${flag}`);
    }
    valores.set(flag, valor);
  }
  const base = valores.get("--base");
  if (base === undefined) throw new Error("argumento obrigatório: --base <sha>");
  return { base, head: valores.get("--head") ?? "HEAD", output: valores.get("--output") ?? "relatorio-testes-sombra.json" };
}
