type ErroProvedor = {
  message?: string;
  statusCode?: number;
  responseBody?: string;
};

/** Normaliza o diagnóstico HTTP sem registrar headers ou credenciais. */
export function detalhesErroProvedor(erro: ErroProvedor): string {
  const status = erro.statusCode ? ` (HTTP ${erro.statusCode})` : "";
  const corpo = erro.responseBody?.trim();
  const sufixo = corpo ? `: ${corpo.slice(0, 2000)}` : "";
  return `${erro.message ?? "Erro do provedor"}${status}${sufixo}`;
}
