import { notFound } from "next/navigation";
import { Dumbbell, Play } from "lucide-react";
import { obterSessaoAtual } from "@/auth/sessao";
import { Button } from "@/components/ui/button";
import {
  AcaoTela,
  CabecalhoTela,
  CartaoLista,
  ExplicacaoAgent,
  FaixaDados,
  LinhaCartaoLista,
  LinhasCartaoLista,
  NotaTela,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { obterPlanoAtivo } from "@/domain/plano/repositorio";
import { iniciarSessaoAction } from "../../actions";

export default async function PreviaSessaoPage({
  params,
}: {
  params: Promise<{ diaId: string }>;
}) {
  const { diaId } = await params;
  const session = await obterSessaoAtual();
  const plano = session?.user?.id
    ? await obterPlanoAtivo(session.user.id)
    : null;
  const dia = plano?.conteudo.bloco.dias.find((item) => item.id === diaId);
  if (!plano || !dia) notFound();

  const totalSeries = dia.exercicios.reduce(
    (total, exercicio) => total + exercicio.series,
    0,
  );

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto={`${plano.conteudo.bloco.divisao} · bloco v${plano.versao ?? 1}`}
        titulo={dia.nome}
        descricao={`${dia.exercicios.length} exercícios · ${totalSeries} séries`}
        voltar={{ href: "/treino", rotulo: "Voltar ao Treino" }}
      />

      <SecoesTela>
        {/* A explicação do agent existe desde a geração do plano, mas até
            aqui só aparecia na revisão do onboarding: quem abre a prévia
            semanas depois é justamente quem esqueceu o motivo. */}
        <ExplicacaoAgent
          pergunta="Por que este treino?"
          explicacao={dia.explicacao}
          tom="forte"
        />

        <CartaoLista>
          <LinhasCartaoLista>
            {dia.exercicios.map((exercicio, indice) => (
              <LinhaCartaoLista
                key={exercicio.exercicioId}
                titulo={exercicio.nome}
                meta={`Exercício ${String(indice + 1).padStart(2, "0")}`}
                valor={
                  <Dumbbell
                    aria-hidden="true"
                    className="size-5 text-muted-foreground"
                  />
                }
              >
                <FaixaDados>
                  {exercicio.series} × {exercicio.repeticoes} reps · RIR{" "}
                  {exercicio.rir}
                </FaixaDados>

                <ExplicacaoAgent
                  pergunta="Por que este exercício?"
                  explicacao={exercicio.explicacao}
                />
              </LinhaCartaoLista>
            ))}
          </LinhasCartaoLista>
        </CartaoLista>
      </SecoesTela>

      <NotaTela>
        As cargas serão preenchidas pelo seu histórico. No primeiro treino,
        encontre uma carga confortável que respeite a meta de RIR.
      </NotaTela>

      {/* `AcaoTela`, não `BarraAcaoFixa`: fixo no rodapé, o CTA
          ficava na mesma faixa da `BottomNav`, e no iPhone (Safari e
          Chrome) a barra do navegador soma outra camada sobre essa
          faixa, cobrindo o botão por completo. */}
      <AcaoTela>
        <form action={iniciarSessaoAction}>
          <input type="hidden" name="diaId" value={dia.id} />
          <Button size="cta" className="w-full">
            <Play aria-hidden="true" className="fill-current" /> Iniciar treino
          </Button>
        </form>
      </AcaoTela>
    </TelaConteudo>
  );
}
