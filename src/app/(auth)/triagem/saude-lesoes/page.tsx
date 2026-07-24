import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";

/**
 * Tela 019 — Lesões e desconfortos
 * (specs/workflow/telas/019-saude-lesoes.md).
 */
export default function SaudeLesoesPage() {
  const { indice, total } = posicaoNaCascata("saude-lesoes");

  return (
    <CascataShell titulo="Lesões ou desconfortos recorrentes?" indice={indice} total={total}>
      <p className="text-body-sm text-muted-foreground">
        Deixe em branco se não houver. O Physique Pilot não diagnostica —
        use este campo só para orientar exercícios a evitar.
      </p>
      <EtapaForm
        etapaAtual="saude-lesoes"
        proximaEtapa={proximoDestinoCascata("saude-lesoes")}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="lesoes">Lesões e desconfortos (opcional)</Label>
          <Textarea id="lesoes" name="lesoes" rows={4} />
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
