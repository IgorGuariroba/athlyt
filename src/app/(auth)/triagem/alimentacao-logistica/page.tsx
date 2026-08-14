import { RadioGroup } from "@/components/ui/radio-group";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "@/components/tela/cascata-shell";
import { carregarRespostasTriagem } from "../_lib/carregar-respostas";
import { EtapaForm } from "../_components/etapa-form";
import { CartaoRadio } from "@/components/tela/opcao-cartao";
import { SeletorTempoPreparo } from "./_components/seletor-tempo-preparo";

const ORCAMENTOS = [
  { value: "baixo", label: "Baixo", descricao: "Prioriza alimentos mais econômicos" },
  { value: "medio", label: "Médio", descricao: "Alguma flexibilidade nas escolhas" },
  { value: "alto", label: "Alto", descricao: "Sem grandes restrições de custo" },
] as const;

/**
 * Tela 022 — Orçamento e preparo
 * (specs/workflow/telas/022-alimentacao-logistica.md).
 */
export default async function AlimentacaoLogisticaPage() {
  const respostas = await carregarRespostasTriagem();
  const { indice, total } = posicaoNaCascata("alimentacao-logistica");

  return (
    <CascataShell titulo="Orçamento e tempo de preparo" indice={indice} total={total}>
      <EtapaForm
        etapaAtual="alimentacao-logistica"
        proximaEtapa={proximoDestinoCascata("alimentacao-logistica")}
      >
        <div className="flex flex-col gap-3">
          <p className="text-label-md text-muted-foreground">
            Orçamento alimentar
          </p>
          <RadioGroup
            name="orcamentoAlimentar"
            defaultValue={respostas.orcamentoAlimentar}
            required
            className="gap-3"
          >
            {ORCAMENTOS.map((opcao) => (
              <CartaoRadio
                key={opcao.value}
                id={`orcamento-${opcao.value}`}
                value={opcao.value}
                titulo={opcao.label}
                descricao={opcao.descricao}
              />
            ))}
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-label-md text-muted-foreground">
            Tempo de preparo por refeição
          </p>
          <SeletorTempoPreparo tempoInicialMin={respostas.tempoPreparoMin} />
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
