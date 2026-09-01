import { redirect } from "next/navigation";
import { Dumbbell, Flame, RefreshCw } from "lucide-react";
import { auth } from "@/auth";
import { RadioGroup } from "@/components/ui/radio-group";
import { OBJETIVOS_COMPOSICAO, posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { CascataShell } from "@/components/tela/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";
import { CartaoRadio } from "@/components/tela/opcao-cartao";

const ICONE_OBJETIVO = {
  recomposicao: RefreshCw,
  "perder-gordura": Flame,
  "ganhar-massa": Dumbbell,
} as const;

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
          {OBJETIVOS_COMPOSICAO.map(({ value, titulo, descricao }) => (
            <CartaoRadio
              key={value}
              id={`objetivo-${value}`}
              value={value}
              titulo={titulo}
              descricao={descricao}
              Icone={ICONE_OBJETIVO[value]}
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
