import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { carregarRespostasTriagem } from "../_lib/carregar-respostas";
import { EtapaForm } from "../_components/etapa-form";
import { SeletorPeso } from "./_components/seletor-peso";

/**
 * Tela 008 — Peso atual (specs/workflow/telas/008-dados-peso.md).
 */
export default async function PesoPage() {
  const respostas = await carregarRespostasTriagem();
  const { indice, total } = posicaoNaCascata("peso");

  return (
    <CascataShell titulo="Qual é o seu peso atual?" indice={indice} total={total}>
      <EtapaForm etapaAtual="peso" proximaEtapa={proximoDestinoCascata("peso")}>
        <SeletorPeso pesoInicialKg={respostas.pesoKg} />
        <p className="text-center text-body-sm text-muted-foreground">
          A tendência ao longo do tempo importa mais que este valor isolado.
        </p>
      </EtapaForm>
    </CascataShell>
  );
}
