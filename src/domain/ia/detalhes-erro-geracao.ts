interface ErroGeracao {
  message?: string;
  cause?: unknown;
  text?: string;
}

/** Nunca devolve causa ou texto: ambos podem repetir prompts e anexos multimodais. */
export function detalhesErroGeracao(_erro: ErroGeracao): string {
  return "Saída inválida do modelo.";
}
