import { RadioGroup } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { carregarRespostasTriagem } from "../_lib/carregar-respostas";
import { EtapaForm } from "../_components/etapa-form";
import { CartaoRadio } from "../_components/opcao-cartao";

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
          <Label htmlFor="tempoPreparoMin">
            Tempo de preparo por refeição (minutos)
          </Label>
          <Input
            id="tempoPreparoMin"
            name="tempoPreparoMin"
            type="number"
            inputMode="numeric"
            min={0}
            max={240}
            defaultValue={respostas.tempoPreparoMin}
            required
            className="h-12 text-base"
          />
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
