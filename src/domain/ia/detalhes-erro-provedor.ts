interface ErroProvedor {
  message?: string;
  statusCode?: number;
  responseBody?: string;
}

/** Diagnóstico seguro: o corpo e a mensagem do SDK podem conter o request inteiro. */
export function detalhesErroProvedor(erro: ErroProvedor): string {
  return erro.statusCode
    ? `Falha do provedor (HTTP ${erro.statusCode})`
    : "Falha do provedor.";
}
