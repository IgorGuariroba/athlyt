import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";

const ORCAMENTOS = [
  { value: "baixo", label: "Baixo" },
  { value: "medio", label: "Médio" },
  { value: "alto", label: "Alto" },
] as const;

/**
 * Tela 022 — Orçamento e preparo
 * (specs/workflow/telas/022-alimentacao-logistica.md).
 */
export default function AlimentacaoLogisticaPage() {
  const { indice, total } = posicaoNaCascata("alimentacao-logistica");

  return (
    <CascataShell titulo="Orçamento e tempo de preparo" indice={indice} total={total}>
      <EtapaForm
        etapaAtual="alimentacao-logistica"
        proximaEtapa={proximoDestinoCascata("alimentacao-logistica")}
      >
        <div className="flex flex-col gap-2">
          <p className="text-label-md text-muted-foreground">
            Orçamento alimentar
          </p>
          <RadioGroup name="orcamentoAlimentar" required className="gap-3">
            {ORCAMENTOS.map((opcao) => (
              <Label
                key={opcao.value}
                htmlFor={`orcamento-${opcao.value}`}
                className="flex min-h-[52px] items-center justify-between rounded-lg border border-border bg-surface-container px-4 py-3 text-body-lg text-on-surface has-data-checked:border-border-strong"
              >
                {opcao.label}
                <RadioGroupItem id={`orcamento-${opcao.value}`} value={opcao.value} />
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="tempoPreparoMin">
            Tempo de preparo por refeição (minutos)
          </Label>
          <Input
            id="tempoPreparoMin"
            name="tempoPreparoMin"
            type="number"
            inputMode="numeric"
            min={0}
            max={240}
            required
            className="h-12 text-base"
          />
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
