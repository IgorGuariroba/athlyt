import { Award, Dumbbell, Sprout, TrendingUp } from "lucide-react";
import { RadioGroup } from "@/components/ui/radio-group";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "@/components/tela/cascata-shell";
import { carregarRespostasTriagem } from "../_lib/carregar-respostas";
import { EtapaForm } from "../_components/etapa-form";
import { CartaoRadio } from "@/components/tela/opcao-cartao";

const OPCOES = [
  {
    value: "nunca-treinou",
    label: "Nunca treinei",
    descricao: "Sem experiência prévia com musculação",
    Icone: Sprout,
  },
  {
    value: "iniciante",
    label: "Iniciante",
    descricao: "Menos de 1 ano de treino consistente",
    Icone: Dumbbell,
  },
  {
    value: "intermediario",
    label: "Intermediário",
    descricao: "Entre 1 e 3 anos de treino consistente",
    Icone: TrendingUp,
  },
  {
    value: "avancado",
    label: "Avançado",
    descricao: "Mais de 3 anos de treino consistente",
    Icone: Award,
  },
] as const;

/**
 * Tela 010 — Experiência de treino
 * (specs/workflow/telas/010-experiencia-treino.md).
 */
export default async function ExperienciaPage() {
  const respostas = await carregarRespostasTriagem();
  const { indice, total } = posicaoNaCascata("experiencia");

  return (
    <CascataShell titulo="Qual sua experiência de treino?" indice={indice} total={total}>
      <EtapaForm
        etapaAtual="experiencia"
        proximaEtapa={proximoDestinoCascata("experiencia")}
      >
        <RadioGroup
          name="experienciaTreino"
          defaultValue={respostas.experienciaTreino}
          required
          className="gap-3"
        >
          {OPCOES.map((opcao) => (
            <CartaoRadio
              key={opcao.value}
              id={`experiencia-${opcao.value}`}
              value={opcao.value}
              titulo={opcao.label}
              descricao={opcao.descricao}
              Icone={opcao.Icone}
            />
          ))}
        </RadioGroup>
      </EtapaForm>
    </CascataShell>
  );
}
