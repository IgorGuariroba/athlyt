import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";

const NIVEIS = [
  { value: "sedentario", label: "Sedentário" },
  { value: "leve", label: "Leve" },
  { value: "moderado", label: "Moderado" },
  { value: "ativo", label: "Ativo" },
  { value: "muito-ativo", label: "Muito ativo" },
] as const;

/**
 * Tela 023 — Rotina, sono e atividade
 * (specs/workflow/telas/023-rotina-sono.md).
 */
export default function RotinaSonoPage() {
  const { indice, total } = posicaoNaCascata("rotina-sono");

  return (
    <CascataShell titulo="Rotina, sono e atividade" indice={indice} total={total}>
      <EtapaForm
        etapaAtual="rotina-sono"
        proximaEtapa={proximoDestinoCascata("rotina-sono")}
      >
        <div className="flex flex-col gap-2">
          <p className="text-label-md text-muted-foreground">
            Nível de atividade habitual
          </p>
          <RadioGroup name="nivelAtividade" required className="gap-3">
            {NIVEIS.map((nivel) => (
              <Label
                key={nivel.value}
                htmlFor={`nivel-${nivel.value}`}
                className="flex min-h-[52px] items-center justify-between rounded-lg border border-border bg-surface-container px-4 py-3 text-body-lg text-on-surface has-data-checked:border-border-strong"
              >
                {nivel.label}
                <RadioGroupItem id={`nivel-${nivel.value}`} value={nivel.value} />
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="horasSono">Horas de sono por noite</Label>
          <Input
            id="horasSono"
            name="horasSono"
            type="number"
            inputMode="numeric"
            min={0}
            max={24}
            required
            className="h-12 text-base"
          />
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
