"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

import { EstadoErro } from "@/components/tela";
import { Button } from "@/components/ui/button";
import { archivo, dmSans } from "./fonts";
import "./globals.css";

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

    let enviado = false;

    try {
      enviado =
        navigator.sendBeacon?.(
          "/api/observabilidade/erro-cliente",
          new Blob([corpo], { type: "application/json" }),
        ) ?? false;
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
  }, [error]);

  return (
    <html
      lang="pt-BR"
      className={`${dmSans.variable} ${archivo.variable} h-full`}
    >
      <body className="min-h-dvh bg-background text-on-surface">
        <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 pb-[calc(var(--safe-bottom)+1.5rem)] pt-[calc(var(--safe-top)+1.5rem)]">
          <header className="flex items-center justify-between border-b border-border pb-4">
            <span className="font-brand text-title font-bold tracking-wide text-on-surface-strong">
              ATHLYT
            </span>
            <span className="text-label-md text-muted-foreground">
              Recuperação
            </span>
          </header>

          <EstadoErro
            titulo="Não foi possível continuar"
            descricao="Algo interrompeu esta etapa. Tente carregá-la novamente para continuar."
            statusDescricao="A ocorrência foi enviada para investigação."
            referencia={error.digest}
            ajuda="Se acontecer de novo, feche e abra o Athlyt."
            acao={
              <Button type="button" size="cta" onClick={reset}>
                <RotateCcw aria-hidden="true" />
                Tentar novamente
              </Button>
            }
          />
        </main>
      </body>
    </html>
  );
}
