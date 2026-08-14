"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/** Exibe o andamento da geração enquanto a action aguarda o agent. */
export function BotaoGerarPlano() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="cta"
      className="w-full"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      ) : null}
      <span aria-live="polite">
        {pending ? "Gerando seu plano..." : "Gerar meu plano com IA"}
      </span>
    </Button>
  );
}
