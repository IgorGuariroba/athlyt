import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { carregarRespostasTriagem } from "../_lib/carregar-respostas";
import { EtapaForm } from "../_components/etapa-form";
import { CartaoCheckbox } from "../_components/opcao-cartao";

const DIAS = [
  { value: "segunda", label: "Segunda" },
  { value: "terca", label: "Terça" },
  { value: "quarta", label: "Quarta" },
  { value: "quinta", label: "Quinta" },
  { value: "sexta", label: "Sexta" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
] as const;

/**
 * Tela 016 — Disponibilidade semanal
 * (specs/workflow/telas/016-disponibilidade-dias.md).
 */
export default async function DisponibilidadePage() {
  const respostas = await carregarRespostasTriagem();
  const { indice, total } = posicaoNaCascata("disponibilidade");

  return (
    <CascataShell titulo="Quais dias você pode treinar?" indice={indice} total={total}>
      <EtapaForm
        etapaAtual="disponibilidade"
        proximaEtapa={proximoDestinoCascata("disponibilidade")}
      >
        <p className="text-body-sm text-muted-foreground">
          Selecione todos os dias em que consegue treinar.
        </p>
        <div className="grid grid-cols-1 gap-3">
          {DIAS.map((dia) => (
            <CartaoCheckbox
              key={dia.value}
              id={`dia-${dia.value}`}
              name="diasDisponiveis"
              value={dia.value}
              titulo={dia.label}
              defaultChecked={respostas.diasDisponiveis?.includes(dia.value)}
            />
          ))}
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
