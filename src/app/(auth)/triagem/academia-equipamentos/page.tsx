import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  EQUIPAMENTOS_DISPONIVEIS,
  posicaoNaCascata,
  proximoDestinoCascata,
} from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";

const LOCAIS = [
  { value: "academia-completa", label: "Academia completa" },
  { value: "condominio", label: "Academia de condomínio" },
  { value: "casa", label: "Casa" },
] as const;

/**
 * Tela 018 — Academia e equipamentos
 * (specs/workflow/telas/018-academia-equipamentos.md).
 */
export default function AcademiaEquipamentosPage() {
  const { indice, total } = posicaoNaCascata("academia-equipamentos");

  return (
    <CascataShell titulo="Onde você treina?" indice={indice} total={total}>
      <EtapaForm
        etapaAtual="academia-equipamentos"
        proximaEtapa={proximoDestinoCascata("academia-equipamentos")}
      >
        <RadioGroup name="localTreino" required className="gap-3">
          {LOCAIS.map((local) => (
            <Label
              key={local.value}
              htmlFor={`local-${local.value}`}
              className="flex min-h-[52px] items-center justify-between rounded-lg border border-border bg-surface-container px-4 py-3 text-body-lg text-on-surface has-data-checked:border-border-strong"
            >
              {local.label}
              <RadioGroupItem id={`local-${local.value}`} value={local.value} />
            </Label>
          ))}
        </RadioGroup>

        <div className="flex flex-col gap-2">
          <p className="text-label-md text-muted-foreground">
            Equipamentos disponíveis
          </p>
          <div className="grid grid-cols-1 gap-2">
            {EQUIPAMENTOS_DISPONIVEIS.map((equipamento) => (
              <Label
                key={equipamento}
                htmlFor={`equipamento-${equipamento}`}
                className="flex min-h-[52px] items-center justify-between rounded-lg border border-border bg-surface-container px-4 py-3 text-body-md text-on-surface"
              >
                {equipamento}
                <Checkbox
                  id={`equipamento-${equipamento}`}
                  name="equipamentos"
                  value={equipamento}
                />
              </Label>
            ))}
          </div>
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
