import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";

/**
 * Tela 005 — Idade (specs/workflow/telas/005-dados-idade.md).
 */
export default function IdadePage() {
  const { indice, total } = posicaoNaCascata("idade");

  return (
    <CascataShell titulo="Qual é a sua data de nascimento?" indice={indice} total={total}>
      <EtapaForm etapaAtual="idade" proximaEtapa={proximoDestinoCascata("idade")}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataNascimento">Data de nascimento</Label>
          <Input
            id="dataNascimento"
            name="dataNascimento"
            type="date"
            required
            className="h-12 text-base"
          />
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
