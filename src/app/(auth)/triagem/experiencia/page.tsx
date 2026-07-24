import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";

const OPCOES = [
  { value: "nunca-treinou", label: "Nunca treinei" },
  { value: "iniciante", label: "Iniciante (menos de 1 ano)" },
  { value: "intermediario", label: "Intermediário (1 a 3 anos)" },
  { value: "avancado", label: "Avançado (mais de 3 anos)" },
] as const;

/**
 * Tela 010 — Experiência de treino
 * (specs/workflow/telas/010-experiencia-treino.md).
 */
export default function ExperienciaPage() {
  const { indice, total } = posicaoNaCascata("experiencia");

  return (
    <CascataShell titulo="Qual sua experiência de treino?" indice={indice} total={total}>
      <EtapaForm
        etapaAtual="experiencia"
        proximaEtapa={proximoDestinoCascata("experiencia")}
      >
        <RadioGroup name="experienciaTreino" required className="gap-3">
          {OPCOES.map((opcao) => (
            <Label
              key={opcao.value}
              htmlFor={`experiencia-${opcao.value}`}
              className="flex min-h-[52px] items-center justify-between rounded-lg border border-border bg-surface-container px-4 py-3 text-body-lg text-on-surface has-data-checked:border-border-strong"
            >
              {opcao.label}
              <RadioGroupItem id={`experiencia-${opcao.value}`} value={opcao.value} />
            </Label>
          ))}
        </RadioGroup>
      </EtapaForm>
    </CascataShell>
  );
}
