import { Card } from "@/components/ui/card";
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
    <CascataShell titulo="Seu objetivo" indice={indice} total={total}>
      <Card className="p-4">
        <p className="text-body-md text-on-surface">
          Construir uma base natural de Men&apos;s Physique: priorizar
          proporções, desempenho e composição corporal.
        </p>
        <p className="mt-3 text-body-sm text-muted-foreground">
          Resultados são limitados por genética, estrutura óssea, experiência,
          rotina e aderência — este app não promete um resultado específico
          nem um prazo garantido.
        </p>
      </Card>
      <EtapaForm etapaAtual="objetivo" proximaEtapa={proximoDestinoCascata("objetivo")}>
        <Label
          htmlFor="objetivoConfirmado"
          className="flex items-center gap-3 rounded-lg border border-border bg-surface-container px-4 py-3"
        >
          <Checkbox
            id="objetivoConfirmado"
            name="objetivoConfirmado"
            value="true"
            required
          />
          Confirmo este objetivo
        </Label>
      </EtapaForm>
    </CascataShell>
  );
}
