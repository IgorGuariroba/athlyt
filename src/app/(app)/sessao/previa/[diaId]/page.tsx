import { notFound } from "next/navigation";
import { Dumbbell, Play } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  BarraAcaoFixa,
  CabecalhoTela,
  CartaoLista,
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
  const session = await auth();
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
    <TelaConteudo comAcaoFixa>
      <CabecalhoTela
        contexto={`${plano.conteudo.bloco.divisao} · bloco v${plano.versao}`}
        titulo={dia.nome}
        descricao={`${dia.exercicios.length} exercícios · ${totalSeries} séries`}
        voltar={{ href: "/inicio", rotulo: "Voltar ao Início" }}
      />

      <SecoesTela>
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
              </LinhaCartaoLista>
            ))}
          </LinhasCartaoLista>
        </CartaoLista>
      </SecoesTela>

      <NotaTela>
        As cargas serão preenchidas pelo seu histórico. No primeiro treino,
        encontre uma carga confortável que respeite a meta de RIR.
      </NotaTela>

      <BarraAcaoFixa>
        <form action={iniciarSessaoAction}>
          <input type="hidden" name="diaId" value={dia.id} />
          <Button size="cta">
            <Play aria-hidden="true" className="fill-current" /> Iniciar treino
          </Button>
        </form>
      </BarraAcaoFixa>
    </TelaConteudo>
  );
}
