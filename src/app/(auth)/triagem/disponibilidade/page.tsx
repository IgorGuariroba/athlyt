import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";

const DIAS = [
  { value: "segunda", label: "Segunda" },
  { value: "terca", label: "Terça" },
  { value: "quarta", label: "Quarta" },
  { value: "quinta", label: "Quinta" },
  { value: "sexta", label: "Sexta" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
] as const;

/**
 * Tela 016 — Disponibilidade semanal
 * (specs/workflow/telas/016-disponibilidade-dias.md).
 */
export default function DisponibilidadePage() {
  const { indice, total } = posicaoNaCascata("disponibilidade");

  return (
    <CascataShell titulo="Quais dias você pode treinar?" indice={indice} total={total}>
      <EtapaForm
        etapaAtual="disponibilidade"
        proximaEtapa={proximoDestinoCascata("disponibilidade")}
      >
        <div className="grid grid-cols-1 gap-2">
          {DIAS.map((dia) => (
            <Label
              key={dia.value}
              htmlFor={`dia-${dia.value}`}
              className="flex min-h-[52px] items-center justify-between rounded-lg border border-border bg-surface-container px-4 py-3 text-body-lg text-on-surface"
            >
              {dia.label}
              <Checkbox
                id={`dia-${dia.value}`}
                name="diasDisponiveis"
                value={dia.value}
              />
            </Label>
          ))}
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
