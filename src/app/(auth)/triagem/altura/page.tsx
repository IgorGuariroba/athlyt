import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "@/components/tela/cascata-shell";
import { carregarRespostasTriagem } from "../_lib/carregar-respostas";
import { EtapaForm } from "../_components/etapa-form";
import { SeletorAltura } from "./_components/seletor-altura";

/**
 * Tela 007 — Altura (specs/workflow/telas/007-dados-altura.md).
 */
export default async function AlturaPage() {
  const respostas = await carregarRespostasTriagem();
  const { indice, total } = posicaoNaCascata("altura");

  return (
    <CascataShell titulo="Qual é a sua altura?" indice={indice} total={total}>
      <EtapaForm etapaAtual="altura" proximaEtapa={proximoDestinoCascata("altura")}>
        <SeletorAltura alturaInicialCm={respostas.alturaCm} />
      </EtapaForm>
    </CascataShell>
  );
}
