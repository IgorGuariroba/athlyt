/**
 * Utilitários para extrair dados tipados de `FormData`.
 *
 * `FormData.get()` retorna `FormDataEntryValue | null` (isto é, `File | string | null`).
 * Usar `String(formData.get(...))` aciona `@typescript-eslint/no-base-to-string` porque
 * `File` herda `Object.prototype.toString`.
 *
 * Estas funções garantem afunilamento estrito de tipos em tempo de compilação e execução.
 */

export function campoTexto(formData: FormData, chave: string, padrao = ""): string {
  const valor = formData.get(chave);
  return typeof valor === "string" ? valor : padrao;
}

export function campoTextoOpcional(formData: FormData, chave: string): string | null {
  const valor = formData.get(chave);
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return limpo.length > 0 ? limpo : null;
}

export function campoNumero(formData: FormData, chave: string, padrao = 0): number {
  const valor = formData.get(chave);
  if (typeof valor !== "string") return padrao;
  const num = Number(valor);
  return Number.isFinite(num) ? num : padrao;
}
