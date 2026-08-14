"use client";

import { RefreshCw } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function BotaoRegenerarPlano() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" className="w-full" disabled={pending}>
      <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
      {pending ? "Gerando outro plano..." : "Gerar outro plano"}
    </Button>
  );
}
