"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

import { EstadoErro, TelaConteudo } from "@/components/tela";
import { Button } from "@/components/ui/button";
import { relatarErroCliente } from "@/observabilidade/erro-cliente";

/**
 * Limite de erro das quatro abas autenticadas.
 *
 * Diferente do `global-error.tsx`, que substitui o documento inteiro e
 * leva embora a `BottomNav`, este boundary vive dentro do casco: uma
 * falha ao carregar o diário não deve custar ao atleta a navegação para
 * as outras abas. Recuperar é `reset()`; desistir é tocar em outra aba.
 */
export default function ErroApp({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    relatarErroCliente(error);
  }, [error]);

  return (
    <TelaConteudo>
      <EstadoErro
        titulo="Não foi possível carregar esta tela"
        descricao="Algo interrompeu o carregamento. Tente de novo ou use outra aba enquanto isso."
        statusDescricao="A ocorrência foi enviada para investigação."
        referencia={error.digest}
        className="px-6"
        acao={
          <Button type="button" size="cta" onClick={reset}>
            <RotateCcw aria-hidden="true" />
            Tentar novamente
          </Button>
        }
      />
    </TelaConteudo>
  );
}
