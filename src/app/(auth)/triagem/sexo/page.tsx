import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";

/**
 * Tela 006 — Sexo biológico (specs/workflow/telas/006-dados-sexo.md).
 */
export default function SexoPage() {
  const { indice, total } = posicaoNaCascata("sexo");

  return (
    <CascataShell titulo="Qual é o seu sexo biológico?" indice={indice} total={total}>
      <p className="text-body-sm text-muted-foreground">
        Usado apenas para contextualizar cálculos de necessidades energéticas.
      </p>
      <EtapaForm etapaAtual="sexo" proximaEtapa={proximoDestinoCascata("sexo")}>
        <RadioGroup name="sexoBiologico" required className="gap-3">
          {[
            { value: "masculino", label: "Masculino" },
            { value: "feminino", label: "Feminino" },
          ].map((opcao) => (
            <Label
              key={opcao.value}
              htmlFor={`sexo-${opcao.value}`}
              className="flex min-h-[52px] items-center justify-between rounded-lg border border-border bg-surface-container px-4 py-3 text-body-lg text-on-surface has-data-checked:border-border-strong"
            >
              {opcao.label}
              <RadioGroupItem id={`sexo-${opcao.value}`} value={opcao.value} />
            </Label>
          ))}
        </RadioGroup>
      </EtapaForm>
    </CascataShell>
  );
}
