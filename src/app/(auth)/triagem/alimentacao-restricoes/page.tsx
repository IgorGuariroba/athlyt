import {
  RESTRICOES_ALIMENTARES_COMUNS,
  posicaoNaCascata,
  proximoDestinoCascata,
} from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { carregarRespostasTriagem } from "../_lib/carregar-respostas";
import { EtapaForm } from "../_components/etapa-form";
import { CartaoCheckbox } from "../_components/opcao-cartao";

/**
 * Tela 021 — Preferências e restrições alimentares
 * (specs/workflow/telas/021-alimentacao-restricoes.md).
 */
export default async function AlimentacaoRestricoesPage() {
  const respostas = await carregarRespostasTriagem();
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
        <div className="grid grid-cols-1 gap-3">
          {RESTRICOES_ALIMENTARES_COMUNS.map((restricao) => (
            <CartaoCheckbox
              key={restricao}
              id={`restricao-${restricao}`}
              name="restricoesAlimentares"
              value={restricao}
              titulo={restricao}
              defaultChecked={respostas.restricoesAlimentares?.includes(restricao)}
            />
          ))}
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
