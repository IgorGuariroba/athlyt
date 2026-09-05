"use client";

import { Button } from "@/components/ui/button";
import { useConexao } from "./estado-conexao";

/**
 * Conclusão da sessão que atravessa a falta de rede.
 *
 * O botão precisa considerar as séries que ainda estão na fila local:
 * offline, o contador que veio do servidor está desatualizado por
 * definição, e travar a conclusão nele obrigaria o atleta a esperar a
 * rede para encerrar um treino que já terminou.
 */
export function ConclusaoSessao({ concluirAction, seriesPendentes }: {
  concluirAction: () => Promise<void>; seriesPendentes: number;
}) {
  const { registrosLocais, estado, registrar, encerradaLocalmente } = useConexao();
  const faltam = Math.max(0, seriesPendentes - registrosLocais.length);

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
        <p className="mb-3 text-center text-body-sm text-muted-foreground">
          {faltam > 0 ? `${faltam} séries não registradas serão ignoradas.` : "Todas as séries foram registradas."}
        </p>
        <Button size="lg" className="h-14 w-full text-base font-bold">
          Concluir treino
        </Button>
      </form>
    );
  }

  return (
    <Button
      size="lg"
      className="h-14 w-full text-base font-bold"
      onClick={() => void registrar("sessao_concluida", {})}
    >
      Concluir treino
    </Button>
  );
}
