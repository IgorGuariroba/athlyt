import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";

/**
 * Tela 007 — Altura (specs/workflow/telas/007-dados-altura.md).
 */
export default function AlturaPage() {
  const { indice, total } = posicaoNaCascata("altura");

  return (
    <CascataShell titulo="Qual é a sua altura?" indice={indice} total={total}>
      <EtapaForm etapaAtual="altura" proximaEtapa={proximoDestinoCascata("altura")}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="alturaCm">Altura (cm)</Label>
          <Input
            id="alturaCm"
            name="alturaCm"
            type="number"
            inputMode="numeric"
            min={100}
            max={250}
            required
            className="h-12 text-base"
          />
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
