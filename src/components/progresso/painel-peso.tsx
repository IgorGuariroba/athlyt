"use client";

import { useActionState } from "react";
import { Target, Weight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface EstadoRegistroPeso { erro?: string; sucesso?: string }

interface Props {
  pesoAtualKg?: number;
  pesoMetaKg?: number;
  aoSalvar: (estado: EstadoRegistroPeso, dados: FormData) => Promise<EstadoRegistroPeso>;
}

/**
 * Registro conjunto da medição de hoje e da meta vigente. O peso atual
 * recebe maior hierarquia porque é a leitura observada; a meta é uma
 * intenção revisável e fica visualmente subordinada, sem virar progresso
 * calculado enquanto não houver uma linha de base explícita.
 */
export function PainelPeso({ pesoAtualKg, pesoMetaKg, aoSalvar }: Props) {
  const [estado, acao, pendente] = useActionState(aoSalvar, {});

  return (
    <Card className="overflow-hidden p-0">
      <form action={acao}>
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] divide-x divide-border">
          <div className="p-5">
            <Label htmlFor="peso-atual" className="mb-3 flex items-center gap-2 text-label-md text-muted-foreground">
              <Weight aria-hidden="true" className="size-4" /> Peso atual
            </Label>
            <div className="flex items-baseline gap-2">
              <Input
                id="peso-atual"
                name="pesoAtualKg"
                type="number"
                inputMode="decimal"
                min="30"
                max="300"
                step="0.1"
                defaultValue={pesoAtualKg}
                placeholder="—"
                aria-describedby="unidade-peso-atual"
                required
                className="h-auto min-w-0 border-0 bg-transparent p-0 text-[2.5rem] leading-none font-bold tracking-tight tabular-nums shadow-none focus-visible:ring-0"
              />
              <span id="unidade-peso-atual" className="text-body-md text-muted-foreground">kg</span>
            </div>
          </div>

          <div className="p-5">
            <Label htmlFor="peso-meta" className="mb-3 flex items-center gap-2 text-label-md text-muted-foreground">
              <Target aria-hidden="true" className="size-4" /> Peso meta
            </Label>
            <div className="flex items-baseline gap-2">
              <Input
                id="peso-meta"
                name="pesoMetaKg"
                type="number"
                inputMode="decimal"
                min="30"
                max="300"
                step="0.1"
                defaultValue={pesoMetaKg}
                placeholder="—"
                aria-describedby="unidade-peso-meta"
                required
                className="h-auto min-w-0 border-0 bg-transparent p-0 text-[1.75rem] leading-none font-bold tracking-tight tabular-nums shadow-none focus-visible:ring-0"
              />
              <span id="unidade-peso-meta" className="text-body-sm text-muted-foreground">kg</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border p-4">
          {estado.erro ? <p role="alert" className="mb-3 text-body-sm text-error">{estado.erro}</p> : null}
          {estado.sucesso ? <p role="status" className="mb-3 text-body-sm text-success">{estado.sucesso}</p> : null}
          <Button type="submit" disabled={pendente} className="h-12 w-full">
            {pendente ? "Salvando…" : "Salvar pesos"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
