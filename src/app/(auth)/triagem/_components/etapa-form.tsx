"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { submeterEtapaTriagem } from "../actions";
import type { EtapaId } from "@/domain/triagem/etapas";

type EstadoForm = { erro: string } | null;

/**
 * Form client-side comum a toda etapa da cascata: liga os campos
 * (passados como children) à server action, mostra erro de validação
 * inline sem perder o valor digitado, e mantém "Continuar" como única
 * ação principal por tela para preservar a hierarquia.
 */
export function EtapaForm({
  etapaAtual,
  proximaEtapa,
  children,
}: {
  etapaAtual: EtapaId;
  proximaEtapa: EtapaId | "resumo";
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const retorno = searchParams.get("retorno");
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(
    async (_estadoAnterior, formData) => {
      const resultado = await submeterEtapaTriagem(
        etapaAtual,
        proximaEtapa,
        formData,
      );
      return resultado ?? null;
    },
    null,
  );

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-6">
      {retorno ? <input type="hidden" name="retorno" value={retorno} /> : null}
      <div className="flex flex-1 flex-col gap-4">{children}</div>

      {estado?.erro ? (
        <p role="alert" className="text-body-sm text-error">
          {estado.erro}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="h-12 w-full" disabled={pendente}>
        {retorno ? "Salvar" : "Continuar"}
      </Button>
    </form>
  );
}
