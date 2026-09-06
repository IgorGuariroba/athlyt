import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, Dumbbell, History, Ruler } from "lucide-react";
import { obterSessaoAtual } from "@/auth/sessao";
import { Button } from "@/components/ui/button";
import {
  CORES_MACRO,
  CabecalhoTela,
  EstadoVazio,
  ExplicacaoAgent,
  ItemNavegacao,
  ListaNavegacao,
  TelaConteudo,
} from "@/components/tela";
import {
  CabecalhoPlanoAtivo,
  CartaoPlanoAtivo,
  CartaoSessaoDoDia,
  CartaoSessaoDoDiaAcao,
  CartaoSessaoDoDiaCorpo,
  MetricasPlanoAtivo,
  PersonalizacaoPendente,
} from "@/components/treino/cartoes-treino";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { montarResumoTriagem } from "@/domain/triagem/resumo";
import { obterPlanoAtivo } from "@/domain/plano/repositorio";
import { listarHistoricoSessoes } from "@/domain/sessao/repositorio";
import { escolherTreinoDoDia } from "@/domain/sessao/treino-do-dia";
import { avaliarConfiancaCorporal } from "@/domain/medicoes";
import { obterPanoramaCorporal } from "@/domain/medicoes/repositorio";

/**
 * Aba Treino: tudo o que é treino, e só treino.
 *
 * Herda o conteúdo que vivia no Início — cartão do treino do dia,
 * Plano Ativo, dias do bloco e histórico. O Início nunca teve conteúdo
 * próprio: era um dashboard inacabado que virou o depósito provisório
 * de treino, dieta e onboarding, justamente porque as abas dedicadas
 * não existiam. Com Treino e Dieta separadas, ele deixa de ter função
 * e redireciona para cá.
 *
 * A meta nutricional que ficava no rodapé do cartão de Plano Ativo foi
 * para a aba Dieta: é lá que ela é comparada com o consumo do dia.
 *
 * Sobre consistência: `escolherTreinoDoDia` decide a rotação pela
 * posição no bloco (A → B → C), não pelo calendário — de propósito,
 * para que antecipar ou repor um treino não quebre a ordem. Por isso a
 * tela mostra o que **foi feito** (concluídas na semana, histórico) e
 * não acusa "treino perdido": sem agendamento por dia da semana, esse
 * conceito não existe no domínio.
 */
export default async function TreinoPage() {
  const session = await obterSessaoAtual();
  const userId = session?.user?.id;
  const [perfil, planoAtivo, historico, panorama] = userId
    ? await Promise.all([
        obterPerfilVigente(userId),
        obterPlanoAtivo(userId),
        listarHistoricoSessoes(userId),
        obterPanoramaCorporal(userId),
      ])
    : [null, null, [], { medicoes: [], pesos: [], gorduras: [], fotos: [], metas: [] }];
  const resumo = montarResumoTriagem(perfil?.respostas ?? {});

  // Dados essenciais pertencem ao onboarding: as abas do casco só são
  // liberadas depois que essa parte da cascata estiver concluída.
  if (resumo.modoConservador && !planoAtivo) redirect("/triagem?retomar=1");

  const respostas = perfil?.respostas ?? {};
  const regioes = new Set(panorama.medicoes.flatMap((m) => [m.regiao, `${m.regiao}:${m.lado}`]));
  const confiancaCorporal = avaliarConfiancaCorporal({
    regioes,
    possuiGordura: panorama.gorduras.length > 0,
    possuiFotos: panorama.fotos.length > 0,
    triagemTreinoCompleta: Boolean(respostas.experienciaTreino && respostas.diasDisponiveis?.length && respostas.equipamentos),
    triagemNutricaoCompleta: Boolean(respostas.pesoKg && respostas.alturaCm && respostas.objetivoComposicao),
    saudeInformada: respostas.lesoes !== undefined && respostas.condicoes !== undefined,
  });
  const treinoDoDia = planoAtivo
    ? escolherTreinoDoDia(planoAtivo.conteudo.bloco.dias, historico)
    : null;

  return (
    <TelaConteudo>
      <CabecalhoTela titulo="Treino" className="pb-4" />

      <div className="flex flex-col gap-6 px-6">
        {Object.values(confiancaCorporal).some((estado) => estado !== "confiavel") ? (
          <PersonalizacaoPendente>
            <div className="flex gap-3 p-5 pb-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-strong">
                <Ruler className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="mb-1 text-label-md font-semibold tracking-wide text-muted-foreground uppercase">
                  Personalização
                </p>
                <h2
                  id="personalizacao-titulo"
                  className="text-title-lg font-bold text-on-surface-strong"
                >
                  Aprimore sua personalização
                </h2>
                <p className="mt-1 text-body-sm text-muted-foreground">
                  Cada dado libera somente a capacidade relacionada.
                </p>
              </div>
            </div>

            <ul className="grid gap-px bg-border">
              {confiancaCorporal.composicaoCorporal !== "confiavel" ? (
                <li className="bg-background px-5 py-4">
                  <strong className="block text-label-lg text-on-surface-strong">
                    Estratégia corporal
                  </strong>
                  <span className="text-body-sm text-muted-foreground">
                    Cintura, pescoço, quadril ou gordura medida.
                  </span>
                </li>
              ) : null}
              {confiancaCorporal.proporcoes !== "confiavel" ? (
                <li className="bg-background px-5 py-4">
                  <strong className="block text-label-lg text-on-surface-strong">
                    Prioridades musculares
                  </strong>
                  <span className="text-body-sm text-muted-foreground">
                    O conjunto completo de medidas.
                  </span>
                </li>
              ) : null}
              {confiancaCorporal.simetriaBilateral !== "confiavel" ? (
                <li className="bg-background px-5 py-4">
                  <strong className="block text-label-lg text-on-surface-strong">
                    Simetria bilateral
                  </strong>
                  <span className="text-body-sm text-muted-foreground">
                    Medidas dos dois lados confirmam assimetrias.
                  </span>
                </li>
              ) : null}
            </ul>

            <Button
              asChild
              size="lg"
              variant="secondary"
              className="h-14 w-full rounded-none text-label-lg font-bold"
            >
              <Link href="/triagem/avaliacao-corporal">
                Continuar avaliação
                <ArrowRight className="size-5" aria-hidden="true" />
              </Link>
            </Button>
          </PersonalizacaoPendente>
        ) : null}

        {planoAtivo ? (
          <>
            {treinoDoDia ? (
              <CartaoSessaoDoDia>
                <CartaoSessaoDoDiaCorpo>
                  <p className="mb-2 text-label-md font-semibold tracking-wide text-muted-foreground uppercase">
                    {treinoDoDia.estado === "em_andamento" ? "Sessão em andamento" : "Próximo treino"}
                  </p>
                  <h2 className="text-headline-md font-bold text-on-surface-strong">{treinoDoDia.dia.nome}</h2>
                  <p className="mt-1 text-body-md text-muted-foreground">
                    {treinoDoDia.dia.exercicios.length} exercícios · {treinoDoDia.dia.exercicios.reduce((total, exercicio) => total + exercicio.series, 0)} séries
                  </p>
                  <p className="mt-2 text-body-sm text-muted-foreground">
                    {treinoDoDia.concluidasNaSemana} de {planoAtivo.conteudo.bloco.dias.length} treinos concluídos nos últimos 7 dias
                  </p>
                </CartaoSessaoDoDiaCorpo>
                <CartaoSessaoDoDiaAcao>
                  <Button asChild size="lg" className="h-14 w-full rounded-none text-label-lg font-bold">
                    {treinoDoDia.estado === "em_andamento" ? (
                      <Link href={`/sessao/${treinoDoDia.sessaoId ?? ""}`}>Retomar treino <ArrowRight className="size-5" /></Link>
                    ) : (
                      <Link href={`/sessao/previa/${treinoDoDia.dia.id}`}>Ver treino <ArrowRight className="size-5" /></Link>
                    )}
                  </Button>
                </CartaoSessaoDoDiaAcao>
              </CartaoSessaoDoDia>
            ) : null}

            <CartaoPlanoAtivo>
              <CabecalhoPlanoAtivo>
                <div className="flex gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-on-surface-strong text-background">
                    <Dumbbell className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`size-2 rounded-full ${CORES_MACRO.carboidratos}`} />
                      <p className="text-label-md font-semibold tracking-wide text-muted-foreground uppercase">
                        Plano Ativo
                      </p>
                    </div>
                    <h2
                      id="plano-ativo-titulo"
                      className="text-title-lg font-bold text-on-surface-strong"
                    >
                      {planoAtivo.conteudo.bloco.divisao}
                    </h2>
                  </div>
                </div>
                <span className="text-body-sm text-muted-foreground">
                  v{planoAtivo.versao}
                </span>
              </CabecalhoPlanoAtivo>

              <div className="px-5 pb-4">
                <ExplicacaoAgent
                  pergunta="Por que esta divisão?"
                  explicacao={planoAtivo.conteudo.bloco.explicacao}
                />
              </div>

              <MetricasPlanoAtivo>
                <div className="bg-background p-4">
                  <CalendarDays
                    className="mb-3 size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <strong className="block text-headline-sm tabular-nums text-on-surface-strong">
                    {planoAtivo.conteudo.bloco.duracaoSemanas} semanas
                  </strong>
                  <span className="text-body-sm text-muted-foreground">
                    duração do bloco
                  </span>
                </div>
                <div className="bg-background p-4">
                  <Dumbbell
                    className="mb-3 size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <strong className="block text-headline-sm tabular-nums text-on-surface-strong">
                    {planoAtivo.conteudo.bloco.dias.length}
                  </strong>
                  <span className="text-body-sm text-muted-foreground">
                    treinos por semana
                  </span>
                </div>
              </MetricasPlanoAtivo>

              {treinoDoDia?.estado !== "em_andamento" ? (
                <div className="border-t border-border p-5">
                  <p className="mb-3 text-label-md font-semibold tracking-wide text-muted-foreground uppercase">
                    Escolher treino do bloco
                  </p>
                  <ListaNavegacao>
                    {planoAtivo.conteudo.bloco.dias.map((dia) => (
                      <ItemNavegacao
                        key={dia.id}
                        href={`/sessao/previa/${dia.id}`}
                        Icone={Dumbbell}
                        rotulo={dia.nome}
                        descricao={`${dia.exercicios.length} exercícios · ${dia.exercicios.reduce((total, exercicio) => total + exercicio.series, 0)} séries`}
                        valor={dia.id === treinoDoDia?.dia.id ? "Próximo" : dia.diaSemana}
                      />
                    ))}
                  </ListaNavegacao>
                </div>
              ) : null}
            </CartaoPlanoAtivo>

            {/* Fora do cartão de Plano Ativo: o histórico é da prática,
                não da prescrição, e continua acessível durante uma
                sessão em andamento. */}
            <ListaNavegacao>
              <ItemNavegacao
                href="/sessao/historico"
                Icone={History}
                rotulo="Histórico de sessões"
                descricao="Revise treinos concluídos ou abandonados"
              />
            </ListaNavegacao>
          </>
        ) : !resumo.modoConservador ? (
          <EstadoVazio
            Icone={Dumbbell}
            titulo="Seu perfil está pronto"
            descricao="Vamos montar seu Bloco de Treino e suas metas nutricionais com base nas respostas da triagem."
            acao={
              <Button asChild size="lg">
                <Link href="/plano/gerando">
                  Gerar meu Plano Ativo
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
        ) : null}
      </div>
    </TelaConteudo>
  );
}
