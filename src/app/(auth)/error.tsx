"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

import { EstadoErro, TelaConteudo } from "@/components/tela";
import { Button } from "@/components/ui/button";
import { relatarErroCliente } from "@/observabilidade/erro-cliente";

/**
 * Limite de erro da triagem e da revisão do plano.
 *
 * Aqui o custo de uma falha é maior que nas abas: o atleta está no meio
 * de um fluxo longo. Como cada etapa persiste a resposta ao avançar,
 * `reset()` recarrega a etapa sem custar o progresso — por isso a ajuda
 * afirma isso explicitamente, em vez de deixar o atleta supor que
 * precisa recomeçar.
 */
export default function ErroTriagem({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    relatarErroCliente(error);
  }, [error]);

  // Fora do casco (app), a rota fornece o <main>; o TelaConteudo é só moldura (issue #200).
  return (
    <main className="flex flex-1 flex-col">
      <TelaConteudo>
        <EstadoErro
          titulo="Não foi possível carregar esta etapa"
          descricao="Algo interrompeu o carregamento desta etapa."
          statusDescricao="A ocorrência foi enviada para investigação."
          referencia={error.digest}
          ajuda="Suas respostas anteriores estão salvas."
          className="px-6"
          acao={
            <Button type="button" size="cta" onClick={reset}>
              <RotateCcw aria-hidden="true" />
              Tentar novamente
            </Button>
          }
        />
      </TelaConteudo>
    </main>
  );
}
