import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";

const FAIXAS = [
  { value: "30", label: "30 minutos" },
  { value: "45", label: "45 minutos" },
  { value: "60", label: "60 minutos" },
  { value: "90", label: "90 minutos" },
] as const;

/**
 * Tela 017 — Duração possível da sessão
 * (specs/workflow/telas/017-duracao-sessao.md).
 */
export default function DuracaoSessaoPage() {
  const { indice, total } = posicaoNaCascata("duracao-sessao");

  return (
    <CascataShell titulo="Quanto tempo por sessão?" indice={indice} total={total}>
      <EtapaForm
        etapaAtual="duracao-sessao"
        proximaEtapa={proximoDestinoCascata("duracao-sessao")}
      >
        <RadioGroup name="duracaoSessaoMin" required className="gap-3">
          {FAIXAS.map((faixa) => (
            <Label
              key={faixa.value}
              htmlFor={`duracao-${faixa.value}`}
              className="flex min-h-[52px] items-center justify-between rounded-lg border border-border bg-surface-container px-4 py-3 text-body-lg text-on-surface has-data-checked:border-border-strong"
            >
              {faixa.label}
              <RadioGroupItem id={`duracao-${faixa.value}`} value={faixa.value} />
            </Label>
          ))}
        </RadioGroup>
      </EtapaForm>
    </CascataShell>
  );
}
