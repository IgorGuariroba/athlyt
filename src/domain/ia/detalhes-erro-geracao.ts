type ErroGeracao = {
  message?: string;
  cause?: unknown;
  text?: string;
};

function mensagem(valor: unknown): string | null {
  if (valor instanceof Error) return valor.message;
  if (typeof valor === "string") return valor;
  if (valor && typeof valor === "object" && "message" in valor) return String(valor.message);
  return null;
}

/** Preserva a causa de validação e a resposta bruta para diagnóstico auditável. */
export function detalhesErroGeracao(erro: ErroGeracao): string {
  const partes = [erro.message ?? "Falha ao gerar objeto"];
  const causa = mensagem(erro.cause);
  if (causa) partes.push(`causa: ${causa}`);
  if (erro.text) partes.push(`resposta: ${erro.text.slice(0, 4000)}`);
  return partes.join(" | ");
}
