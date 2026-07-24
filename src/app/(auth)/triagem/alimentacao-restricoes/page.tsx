import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  RESTRICOES_ALIMENTARES_COMUNS,
  posicaoNaCascata,
  proximoDestinoCascata,
} from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";

/**
 * Tela 021 — Preferências e restrições alimentares
 * (specs/workflow/telas/021-alimentacao-restricoes.md).
 */
export default function AlimentacaoRestricoesPage() {
  const { indice, total } = posicaoNaCascata("alimentacao-restricoes");

  return (
    <CascataShell
      titulo="Alguma preferência ou restrição alimentar?"
      indice={indice}
      total={total}
    >
      <EtapaForm
        etapaAtual="alimentacao-restricoes"
        proximaEtapa={proximoDestinoCascata("alimentacao-restricoes")}
      >
        <div className="grid grid-cols-1 gap-2">
          {RESTRICOES_ALIMENTARES_COMUNS.map((restricao) => (
            <Label
              key={restricao}
              htmlFor={`restricao-${restricao}`}
              className="flex min-h-[52px] items-center justify-between rounded-lg border border-border bg-surface-container px-4 py-3 text-body-md text-on-surface"
            >
              {restricao}
              <Checkbox
                id={`restricao-${restricao}`}
                name="restricoesAlimentares"
                value={restricao}
              />
            </Label>
          ))}
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
