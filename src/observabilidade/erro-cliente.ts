/**
 * Relato de erro de renderização do cliente para a observabilidade.
 *
 * Extraído de `global-error.tsx` quando os boundaries por segmento
 * passaram a existir: a tela de recuperação varia (uma substitui o
 * documento, outra vive dentro do casco de abas), mas o protocolo de
 * relato é o mesmo e não pode divergir entre elas.
 *
 * Só viajam `name` e `digest` — a mensagem de erro pode carregar dados
 * do atleta, e o digest já é a chave que correlaciona com o log do
 * servidor. `sendBeacon` é a via preferida por sobreviver ao descarte
 * da página; o `fetch` com `keepalive` cobre o navegador que não o
 * expõe ou o recusa por tamanho.
 */
export function relatarErroCliente(error: Error & { digest?: string }): void {
  const corpo = JSON.stringify({
    name: error.name.slice(0, 80),
    digest: error.digest?.slice(0, 128),
  });

  let enviado = false;

  try {
    enviado =
      "sendBeacon" in navigator
        ? navigator.sendBeacon(
            "/api/observabilidade/erro-cliente",
            new Blob([corpo], { type: "application/json" }),
          )
        : false;
  } catch {
    // Se o beacon falhar, a tentativa por fetch abaixo ainda pode funcionar.
  }

  if (enviado) return;

  try {
    void fetch("/api/observabilidade/erro-cliente", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: corpo,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // A tela de recuperação não pode falhar ao relatar o erro original.
  }
}
