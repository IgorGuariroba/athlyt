"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const corpo = JSON.stringify({
      name: error.name.slice(0, 80),
      digest: error.digest?.slice(0, 128),
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/observabilidade/erro-cliente",
        new Blob([corpo], { type: "application/json" }),
      );
      return;
    }

    void fetch("/api/observabilidade/erro-cliente", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: corpo,
      keepalive: true,
    });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <main>
          <h1>Algo deu errado</h1>
          <p>O erro foi registrado para investigação.</p>
          <button type="button" onClick={reset}>
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
