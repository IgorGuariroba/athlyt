import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  CabecalhoTela,
  CartaoLista,
  FaixaDados,
  LinhaCartaoLista,
  LinhasCartaoLista,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { obterReavaliacaoEmAnalise } from "@/domain/plano/reavaliacao";
import {
  obterExperimentoAtivo,
  obterPlanoAtivo,
  obterRascunho,
} from "@/domain/plano/repositorio";
import { rotuloObjetivoComposicao } from "@/domain/triagem/etapas";
import { executarRollback, iniciarExperimento } from "../actions";

const VARIAVEIS = [
  "volume de treino",
  "seleção de exercícios",
  "energia e macros",
  "cadência",
] as const;

export default async function ExperimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ sucesso?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const [aviso, experimento, rascunho, planoAtivo, reavaliacao] = await Promise.all([
    searchParams,
    obterExperimentoAtivo(session.user.id),
    obterRascunho(session.user.id),
    obterPlanoAtivo(session.user.id),
    obterReavaliacaoEmAnalise(session.user.id),
  ]);

  const objetivoNovo = reavaliacao
    ? rotuloObjetivoComposicao(reavaliacao.objetivoNovo)
    : "novo objetivo";

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Experimento de Plano"
        titulo="Uma hipótese, poucas variáveis"
        descricao="O Plano Estável permanece preservado para rollback."
        voltar={{ href: "/progresso/revisao/proposta", rotulo: "Voltar à proposta" }}
      />

      <SecoesTela>
        {aviso.sucesso ? <p role="status" className="text-success">{aviso.sucesso}</p> : null}

        {experimento ? (
          <CartaoLista>
            <LinhasCartaoLista>
              <LinhaCartaoLista titulo="Experimento ativo" meta={`Janela mínima: ${experimento.janelaMinimaSemanas} semanas`}>
                <p className="text-body-md text-on-surface">{experimento.hipotese}</p>
                <p className="text-body-sm text-muted-foreground">
                  Variáveis: {experimento.variaveis.join(", ")}
                </p>
              </LinhaCartaoLista>
              <LinhaCartaoLista titulo="Critério de sucesso">
                <p className="text-body-sm">{experimento.criterioSucesso}</p>
              </LinhaCartaoLista>
              <LinhaCartaoLista titulo="Critério de interrupção">
                <p className="text-body-sm">{experimento.criterioInterrupcao}</p>
              </LinhaCartaoLista>
            </LinhasCartaoLista>
            <form action={executarRollback} className="p-4">
              <input type="hidden" name="experimentId" value={experimento.id} />
              <Button variant="destructive" className="w-full">
                Interromper e restaurar Plano Estável
              </Button>
            </form>
          </CartaoLista>
        ) : rascunho && planoAtivo ? (
          <form action={iniciarExperimento} className="flex flex-col gap-5">
            <input type="hidden" name="planoId" value={rascunho.id} />
            {reavaliacao ? <input type="hidden" name="reavaliacaoId" value={reavaliacao.id} /> : null}

            <CartaoLista>
              <LinhasCartaoLista>
                <LinhaCartaoLista titulo="Comparação do plano" meta="Atual → candidato">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FaixaDados>Plano Ativo v{planoAtivo.versao}</FaixaDados>
                      <p className="mt-2 text-body-sm">{planoAtivo.conteudo.nutricao.calorias} kcal</p>
                      <p className="text-body-sm">{planoAtivo.conteudo.bloco.dias.length} treinos/semana</p>
                    </div>
                    <div>
                      <FaixaDados>Candidato</FaixaDados>
                      <p className="mt-2 text-body-sm">{rascunho.conteudo.nutricao.calorias} kcal</p>
                      <p className="text-body-sm">{rascunho.conteudo.bloco.dias.length} treinos/semana</p>
                    </div>
                  </div>
                </LinhaCartaoLista>
                <LinhaCartaoLista titulo="Objetivo considerado">
                  <p className="text-body-md text-on-surface">{objetivoNovo}</p>
                </LinhaCartaoLista>
              </LinhasCartaoLista>
            </CartaoLista>

            <CartaoLista className="flex flex-col gap-4 p-4">
              <label className="flex flex-col gap-2 text-body-sm">
                Hipótese
                <Input
                  required
                  name="hipotese"
                  defaultValue={`Ao alinhar energia e macros ao objetivo de ${objetivoNovo.toLocaleLowerCase("pt-BR")}, esperamos preservar o desempenho enquanto acompanhamos a tendência corporal.`}
                />
              </label>

              <fieldset className="flex flex-col gap-3 text-body-sm">
                <legend className="mb-2 font-semibold">Variáveis alteradas</legend>
                {VARIAVEIS.map((item) => (
                  <label key={item} className="flex items-center gap-3">
                    <Checkbox
                      name="variaveis"
                      value={item}
                      defaultChecked={item === "energia e macros"}
                    />
                    {item}
                  </label>
                ))}
              </fieldset>

              <label className="flex flex-col gap-2 text-body-sm">
                Critério de sucesso
                <Input required name="criterioSucesso" defaultValue="Desempenho preservado e tendência corporal coerente com o novo objetivo" />
              </label>
              <label className="flex flex-col gap-2 text-body-sm">
                Critério de interrupção
                <Input required name="criterioInterrupcao" defaultValue="Queda persistente de desempenho, recuperação baixa ou sinal de risco" />
              </label>
              <label className="flex flex-col gap-2 text-body-sm">
                Janela mínima (semanas)
                <Input required type="number" min="1" max="8" name="janelaMinimaSemanas" defaultValue="2" />
              </label>
              <Button type="submit">Ativar Experimento de Plano</Button>
            </CartaoLista>
          </form>
        ) : (
          <CartaoLista className="p-4 text-body-sm text-muted-foreground">
            Nenhum experimento ativo ou rascunho aprovado.
          </CartaoLista>
        )}
      </SecoesTela>
    </TelaConteudo>
  );
}
