"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useConexao } from "./estado-conexao";

/**
 * Conclusão da sessão que atravessa a falta de rede (tela 043).
 *
 * O botão precisa considerar as séries que ainda estão na fila local:
 * offline, o contador que veio do servidor está desatualizado por
 * definição, e travar a conclusão nele obrigaria o atleta a esperar a
 * rede para encerrar um treino que já terminou.
 */
export function ConclusaoSessao({ concluirAction, seriesPendentes }: {
  concluirAction: () => Promise<void>; seriesPendentes: number;
}) {
  const { registrosLocais, estado, registrar } = useConexao();
  const [encerradaLocalmente, setEncerrada] = useState(false);
  const faltam = Math.max(0, seriesPendentes - registrosLocais.length);
  const completo = faltam === 0;

  if (encerradaLocalmente) {
    return (
      <p role="status" className="rounded-xl border border-border bg-surface-container p-4 text-center text-body-sm text-muted-foreground">
        Treino encerrado neste aparelho. O resumo aparece assim que a sincronização terminar.
      </p>
    );
  }

  // Online e com tudo confirmado pelo servidor: caminho normal, que
  // redireciona para o resumo.
  if (estado !== "offline" && registrosLocais.length === 0) {
    return (
      <form action={concluirAction}>
        <Button size="lg" disabled={!completo} className="h-14 w-full text-base font-bold">
          {completo ? "Concluir treino" : `Complete ${faltam} séries para concluir`}
        </Button>
      </form>
    );
  }

  return (
    <Button
      size="lg"
      disabled={!completo}
      className="h-14 w-full text-base font-bold"
      onClick={async () => {
        setEncerrada(true);
        await registrar("sessao_concluida", {});
      }}
    >
      {completo ? "Concluir treino" : `Complete ${faltam} séries para concluir`}
    </Button>
  );
}
