type ErroGeracao = {
  message?: string;
  cause?: unknown;
  text?: string;
};

/** Nunca devolve causa ou texto: ambos podem repetir prompts e anexos multimodais. */
export function detalhesErroGeracao(erro: ErroGeracao): string {
  void erro;
  return "Saída inválida do modelo.";
}
