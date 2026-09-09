/**
 * A chave física da foto é um detalhe do ciclo de vida no domínio.
 * Actions e scripts recebem apenas a FotoCorporal já autorizada.
 */
export const ARQUIVOS_COM_OBJECT_KEY_PERMITIDO = new Set<string>([]);

export function arquivosQueExibemObjectKey(
  arquivos: readonly { caminho: string; fonte: string }[],
): string[] {
  return arquivos
    .filter(({ caminho }) => !ARQUIVOS_COM_OBJECT_KEY_PERMITIDO.has(caminho))
    .filter(({ fonte }) => fonte.includes("objectKey"))
    .map(({ caminho }) => `${caminho} conhece objectKey: use a interface do ciclo de vida de fotos`);
}
