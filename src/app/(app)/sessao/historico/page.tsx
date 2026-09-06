import Link from "next/link";
import { CheckCircle2, CircleSlash2, Dumbbell } from "lucide-react";
import { obterSessaoAtual } from "@/auth/sessao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CabecalhoTela,
  CartaoLista,
  EstadoVazio,
  LinhaCartaoLista,
  LinhasCartaoLista,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { listarHistoricoSessoes, resumirSessao } from "@/domain/sessao/repositorio";

/**
 * Histórico de sessões: itens homogêneos formam um único cartão com
 * divisores, em vez de um cartão separado por sessão.
 */
const APRESENTACAO = {
  concluida: { rotulo: "Concluída", Icone: CheckCircle2, cor: "text-success" },
  abandonada: { rotulo: "Abandonada", Icone: CircleSlash2, cor: "text-warning" },
  em_andamento: { rotulo: "Continuar", Icone: Dumbbell, cor: "text-info" },
} as const;

export default async function HistoricoPage() {
  const session = await obterSessaoAtual();
  const historico = session?.user?.id
    ? await listarHistoricoSessoes(session.user.id)
    : [];

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Sessão de treino"
        titulo="Histórico"
        voltar={{ href: "/treino", rotulo: "Voltar ao Treino" }}
      />

      <SecoesTela>
        {historico.length === 0 ? (
          <EstadoVazio
            Icone={Dumbbell}
            titulo="Nenhuma sessão ainda"
            descricao="Sessões concluídas ou abandonadas aparecem aqui, com séries e volume."
            acao={
              <Button asChild variant="outline" size="sm">
                <Link href="/treino">Ver treino de hoje</Link>
              </Button>
            }
          />
        ) : (
          <CartaoLista>
            <LinhasCartaoLista>
              {historico.map((item) => {
                const resumo = resumirSessao(item);
                const { rotulo, Icone, cor } = APRESENTACAO[item.estado];
                const href =
                  item.estado === "em_andamento"
                    ? `/sessao/${item.id}`
                    : `/sessao/${item.id}/resumo`;

                return (
                  <LinhaCartaoLista
                    key={item.id}
                    titulo={item.nome}
                    meta={`${item.startedAt.toLocaleDateString("pt-BR")} · ${resumo.totalSeries} séries · ${resumo.volumeKg} kg`}
                    valor={
                      <span className="flex items-center gap-1.5">
                        <Icone aria-hidden="true" className={`size-4 ${cor}`} />
                        <Badge variant="outline">{rotulo}</Badge>
                      </span>
                    }
                  >
                    <Button asChild variant="outline" size="sm" className="w-fit">
                      <Link href={href}>
                        {item.estado === "em_andamento"
                          ? "Continuar sessão"
                          : "Ver resumo"}
                      </Link>
                    </Button>
                  </LinhaCartaoLista>
                );
              })}
            </LinhasCartaoLista>
          </CartaoLista>
        )}
      </SecoesTela>
    </TelaConteudo>
  );
}
