import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";

/**
 * Tela 008 — Peso atual (specs/workflow/telas/008-dados-peso.md).
 */
export default function PesoPage() {
  const { indice, total } = posicaoNaCascata("peso");

  return (
    <CascataShell titulo="Qual é o seu peso atual?" indice={indice} total={total}>
      <p className="text-body-sm text-muted-foreground">
        A tendência ao longo do tempo importa mais que este valor isolado.
      </p>
      <EtapaForm etapaAtual="peso" proximaEtapa={proximoDestinoCascata("peso")}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pesoKg">Peso (kg)</Label>
          <Input
            id="pesoKg"
            name="pesoKg"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={30}
            max={300}
            required
            className="h-12 text-base"
          />
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
