import { Dumbbell } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";

/**
 * Tela 009 — Objetivo (specs/workflow/telas/009-objetivo.md).
 */
export default function ObjetivoPage() {
  const { indice, total } = posicaoNaCascata("objetivo");

  return (
    <CascataShell
      titulo="Qual é o seu objetivo?"
      indice={indice}
      total={total}
    >
      <EtapaForm etapaAtual="objetivo" proximaEtapa={proximoDestinoCascata("objetivo")}>
        <Label
          htmlFor="objetivoConfirmado"
          className="group flex min-h-40 cursor-pointer items-center gap-5 rounded-xl border-2 border-border-strong bg-surface px-5 py-6 transition-colors hover:bg-surface-container has-data-checked:border-on-surface-strong"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-on-surface-strong text-background">
            <Dumbbell className="size-7" aria-hidden="true" />
          </span>

          <span className="flex flex-1 flex-col gap-1">
            <span className="text-title text-on-surface-strong">
              Construir um físico atlético
            </span>
            <span className="text-body-sm font-normal text-muted-foreground">
              Proporções, força e composição corporal
            </span>
          </span>

          <Checkbox
            id="objetivoConfirmado"
            name="objetivoConfirmado"
            value="true"
            required
            className="size-7 rounded-full border-4 border-border-strong bg-transparent data-checked:border-on-surface-strong data-checked:bg-on-surface-strong [&_svg]:size-4"
          />
        </Label>

        <div className="rounded-xl bg-surface-container px-4 py-4">
          <p className="text-body-sm text-muted-foreground">
            Vamos priorizar uma base natural de Men&apos;s Physique. Seus
            resultados dependem de genética, estrutura, experiência, rotina e
            aderência — sem promessas de prazo ou resultado específico.
          </p>
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
