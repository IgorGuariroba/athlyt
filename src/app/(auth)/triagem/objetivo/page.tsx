import { redirect } from "next/navigation";
import { Dumbbell, Flame, RefreshCw } from "lucide-react";
import { auth } from "@/auth";
import { RadioGroup } from "@/components/ui/radio-group";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { CascataShell } from "../_components/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";
import { CartaoRadio } from "../_components/opcao-cartao";

const OBJETIVOS = [
  {
    value: "recomposicao",
    titulo: "Recomposição corporal",
    descricao:
      "Reduzir a gordura de cerca de 30% para próximo de 10% enquanto maximiza a massa muscular",
    Icone: RefreshCw,
  },
  {
    value: "perder-gordura",
    titulo: "Priorizar perda de gordura",
    descricao: "Reduzir gordura corporal preservando o máximo de massa muscular",
    Icone: Flame,
  },
  {
    value: "ganhar-massa",
    titulo: "Priorizar ganho de massa muscular",
    descricao: "Maximizar hipertrofia com ganho de gordura controlado",
    Icone: Dumbbell,
  },
] as const;

/** Tela 009 — Objetivo (specs/workflow/telas/009-objetivo.md). */
export default async function ObjetivoPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/");

  const perfil = await obterPerfilVigente(userId);
  const { indice, total } = posicaoNaCascata("objetivo");

  return (
    <CascataShell titulo="Qual é o seu objetivo atual?" indice={indice} total={total}>
      <EtapaForm etapaAtual="objetivo" proximaEtapa={proximoDestinoCascata("objetivo")}>
        <RadioGroup
          name="objetivoComposicao"
          defaultValue={perfil?.respostas.objetivoComposicao}
          required
          className="gap-3"
        >
          {OBJETIVOS.map(({ value, titulo, descricao, Icone }) => (
            <CartaoRadio
              key={value}
              id={`objetivo-${value}`}
              value={value}
              titulo={titulo}
              descricao={descricao}
              Icone={Icone}
            />
          ))}
        </RadioGroup>

        <div className="rounded-xl bg-surface-container px-4 py-4">
          <p className="text-body-sm text-muted-foreground">
            Vamos buscar uma base natural de Men&apos;s Physique. A estratégia será
            ajustada com segurança conforme sua resposta ao plano, sem promessas
            de prazo ou resultado específico.
          </p>
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
