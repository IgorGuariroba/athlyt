import { redirect } from "next/navigation";
import { Check, Flame, UtensilsCrossed } from "lucide-react";

import { obterSessaoAtual } from "@/auth/sessao";
import { Button } from "@/components/ui/button";
import {
  BarraAcaoFixa,
  BarraMacro,
  CabecalhoCartaoLista,
  CabecalhoTela,
  CartaoLista,
  LinhaCartaoLista,
  LinhasCartaoLista,
  NotaTela,
  PorQueIsso,
  Revelar,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { descreverItemDoPlano } from "@/domain/plano/item-planejado";
import { obterRascunho } from "@/domain/plano/repositorio";
import { ativarPlanoAction } from "../../actions";

export default async function RevisaoNutricaoPage() {
  const session = await obterSessaoAtual();
  if (!session?.user?.id) redirect("/");
  const plano = await obterRascunho(session.user.id);
  if (!plano) redirect("/plano/gerando");
  const meta = plano.conteudo.nutricao;

  // Fora do casco (app), a rota fornece o <main>; o TelaConteudo é só moldura (issue #200).
  return (
    <main className="flex flex-1 flex-col">
      <TelaConteudo comAcaoFixa>
        <CabecalhoTela
          contexto="Revisão do plano"
          titulo="Estratégia nutricional"
          descricao={meta.estrategia}
        />

        <SecoesTela>
          <section
            aria-labelledby="meta-diaria"
            className="flex flex-col gap-5 rounded-xl border border-border bg-surface-container p-4"
          >
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-body-sm text-muted-foreground">Meta diária</p>
                <h2
                  id="meta-diaria"
                  className="font-brand text-[2rem] leading-tight font-bold tracking-tight tabular-nums text-on-surface-strong"
                >
                  {meta.calorias} kcal
                </h2>
              </div>
              <Flame
                className="size-7 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </div>

            <div className="flex flex-col gap-4">
              <BarraMacro
                macro="proteina"
                gramas={meta.proteinaG}
                caloriasTotais={meta.calorias}
              />
              <BarraMacro
                macro="carboidratos"
                gramas={meta.carboidratosG}
                caloriasTotais={meta.calorias}
              />
              <BarraMacro
                macro="gorduras"
                gramas={meta.gordurasG}
                caloriasTotais={meta.calorias}
              />
            </div>

            <p className="border-t border-border pt-4 text-body-sm tabular-nums text-muted-foreground">
              Fibras: {meta.fibrasG} g por dia
            </p>

            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <Revelar rotulo="Por que estas calorias?">
                <PorQueIsso explicacao={meta.explicacoes?.calorias} />
              </Revelar>
              <Revelar rotulo="Por que esta proteína?">
                <PorQueIsso explicacao={meta.explicacoes?.proteinaG} />
              </Revelar>
              <Revelar rotulo="Por que estes carboidratos?">
                <PorQueIsso explicacao={meta.explicacoes?.carboidratosG} />
              </Revelar>
              <Revelar rotulo="Por que estas gorduras?">
                <PorQueIsso explicacao={meta.explicacoes?.gordurasG} />
              </Revelar>
              <Revelar rotulo="Por que esta estratégia?">
                <PorQueIsso explicacao={meta.explicacoes?.estrategia} />
              </Revelar>
            </div>
          </section>

          <CartaoLista aria-labelledby="distribuicao">
            <CabecalhoCartaoLista
              id="distribuicao"
              titulo="Distribuição entre refeições"
              meta={`${meta.refeicoes.length} refeições · ${meta.calorias} kcal no total`}
              Icone={UtensilsCrossed}
            />
            <LinhasCartaoLista>
              {meta.refeicoes.map((refeicao) => (
                <LinhaCartaoLista
                  key={refeicao.nome}
                  titulo={refeicao.nome}
                  meta={
                    <span className="tabular-nums">
                      {refeicao.percentual}% da meta · {refeicao.proteinaG} g
                      proteína
                    </span>
                  }
                  valor={`${refeicao.calorias} kcal`}
                >
                  <ul className="flex flex-wrap gap-2">
                    {refeicao.itens.map((item) => {
                      const descricao = descreverItemDoPlano(item);
                      return (
                        <li
                          key={descricao}
                          className="rounded-md bg-surface-container-high px-2.5 py-1 text-body-sm text-on-surface"
                        >
                          {descricao}
                        </li>
                      );
                    })}
                  </ul>
                  <Revelar rotulo="Por que esta refeição?">
                    <PorQueIsso explicacao={refeicao.explicacao} />
                  </Revelar>
                </LinhaCartaoLista>
              ))}
            </LinhasCartaoLista>
          </CartaoLista>
        </SecoesTela>

        <NotaTela>
          As metas são estimativas iniciais personalizadas pelo agent, não
          aconselhamento médico ou nutricional. Serão avaliadas com sua resposta
          real na Revisão Semanal.
        </NotaTela>

        <BarraAcaoFixa>
          <form action={ativarPlanoAction}>
            <input type="hidden" name="planoId" value={plano.id} />
            <Button
              type="submit"
              size="lg"
              className="h-14 w-full text-base font-bold"
            >
              <Check className="size-5" aria-hidden="true" />
              Ativar plano
            </Button>
          </form>
        </BarraAcaoFixa>
      </TelaConteudo>
    </main>
  );
}
