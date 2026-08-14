import { Mars, Venus } from "lucide-react";
import { RadioGroup } from "@/components/ui/radio-group";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "@/components/tela/cascata-shell";
import { carregarRespostasTriagem } from "../_lib/carregar-respostas";
import { EtapaForm } from "../_components/etapa-form";
import { CartaoRadio } from "@/components/tela/opcao-cartao";

const OPCOES = [
  { value: "feminino", label: "Feminino", Icone: Venus },
  { value: "masculino", label: "Masculino", Icone: Mars },
] as const;

/**
 * Tela 006 — Sexo biológico (specs/workflow/telas/006-dados-sexo.md).
 */
export default async function SexoPage() {
  const respostas = await carregarRespostasTriagem();
  const { indice, total } = posicaoNaCascata("sexo");

  return (
    <CascataShell titulo="Qual é o seu sexo biológico?" indice={indice} total={total}>
      <p className="text-body-sm text-muted-foreground">
        Usado apenas para contextualizar cálculos de necessidades energéticas.
      </p>
      <EtapaForm etapaAtual="sexo" proximaEtapa={proximoDestinoCascata("sexo")}>
        <RadioGroup
          name="sexoBiologico"
          defaultValue={respostas.sexoBiologico}
          required
          className="gap-3"
        >
          {OPCOES.map((opcao) => (
            <CartaoRadio
              key={opcao.value}
              id={`sexo-${opcao.value}`}
              value={opcao.value}
              titulo={opcao.label}
              Icone={opcao.Icone}
            />
          ))}
        </RadioGroup>
      </EtapaForm>
    </CascataShell>
  );
}
