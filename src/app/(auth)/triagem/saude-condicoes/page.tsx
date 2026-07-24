import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";

/**
 * Tela 020 — Condições e medicamentos
 * (specs/workflow/telas/020-saude-condicoes.md).
 */
export default function SaudeCondicoesPage() {
  const { indice, total } = posicaoNaCascata("saude-condicoes");

  return (
    <CascataShell titulo="Condições de saúde ou medicamentos?" indice={indice} total={total}>
      <p className="text-body-sm text-muted-foreground">
        O Physique Pilot não diagnostica nem substitui um profissional de
        saúde — use este campo para contextualizar riscos conhecidos.
      </p>
      <EtapaForm
        etapaAtual="saude-condicoes"
        proximaEtapa={proximoDestinoCascata("saude-condicoes")}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="condicoes">Condições e medicamentos (opcional)</Label>
          <Textarea id="condicoes" name="condicoes" rows={4} />
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
