import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, Dumbbell, Flame, History, Ruler } from "lucide-react";
import { auth } from "@/auth";
import { sair } from "../../(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  CORES_MACRO,
  CartaoLista,
  ExplicacaoAgent,
  ItemNavegacao,
  ListaNavegacao,
  TelaConteudo,
} from "@/components/tela";
import {
  BoasVindasInicio,
  CabecalhoInicio,
  CabecalhoPlanoAtivo,
  CartaoPlanoAtivo,
  CartaoSessaoDoDia,
  CartaoSessaoDoDiaAcao,
  CartaoSessaoDoDiaCorpo,
  MetaNutricional,
  MetricasPlanoAtivo,
  PersonalizacaoInicio,
  ResumoMacros,
} from "@/components/inicio/cartoes-inicio";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { montarResumoTriagem } from "@/domain/triagem/resumo";
import { obterPlanoAtivo } from "@/domain/plano/repositorio";
import { listarHistoricoSessoes } from "@/domain/sessao/repositorio";
import { escolherTreinoDoDia } from "@/domain/sessao/treino-do-dia";
import { avaliarConfiancaCorporal } from "@/domain/medicoes";
import { obterPanoramaCorporal } from "@/domain/medicoes/repositorio";

/**
 * Casco da aba Início (telas 029–031). Os cartões de treino do dia,
 * check-in e próxima refeição chegam nos tickets seguintes; este
 * ticket entrega o estado do Modo Conservador (tela 031) derivado do
 * perfil de triagem (user stories 14, 15).
 */
export default async function InicioPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const [perfil, planoAtivo, historico, panorama] = userId
    ? await Promise.all([obterPerfilVigente(userId), obterPlanoAtivo(userId), listarHistoricoSessoes(userId), obterPanoramaCorporal(userId)])
    : [null, null, [], { medicoes: [], pesos: [], gorduras: [], fotos: [], metas: [] }];
  const resumo = montarResumoTriagem(perfil?.respostas ?? {});

  // Dados essenciais pertencem ao onboarding: a tela inicial só é
  // liberada depois que essa parte da cascata estiver concluída.
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
      <div className="flex flex-col gap-6 px-6">
      <CabecalhoInicio>
        <div className="flex items-center gap-2">
          <h1 className="text-headline-md font-bold text-on-surface-strong">
            Início
          </h1>
        </div>
        <form action={sair}>
          <Button type="submit" variant="ghost" size="sm">
            Sair
          </Button>
        </form>
      </CabecalhoInicio>

      <BoasVindasInicio className="p-4 text-body-md text-muted-foreground">
        Olá, {session?.user?.name ?? session?.user?.email}. Seus cartões de
        prioridade do dia vão aparecer aqui.
      </BoasVindasInicio>

      {Object.values(confiancaCorporal).some((estado) => estado !== "confiavel") ? (
        <PersonalizacaoInicio>
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
            className="h-14 w-full rounded-none text-base font-bold"
          >
            <Link href="/triagem/avaliacao-corporal">
              Continuar avaliação
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </Button>
        </PersonalizacaoInicio>
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
          <Button asChild size="lg" className="h-14 w-full rounded-none text-base font-bold">
            {treinoDoDia.estado === "em_andamento" ? (
              <Link href={`/sessao/${treinoDoDia.sessaoId}`}>Retomar treino <ArrowRight className="size-5" /></Link>
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
                <ItemNavegacao
                  href="/sessao/historico"
                  Icone={History}
                  rotulo="Histórico de sessões"
                  descricao="Revise treinos concluídos ou abandonados"
                />
              </ListaNavegacao>
            </div>
          ) : null}

          <MetaNutricional>
          <ResumoMacros>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-body-sm text-muted-foreground">
                  Meta nutricional
                </p>
                <strong className="text-headline-md tabular-nums text-on-surface-strong">
                  {planoAtivo.conteudo.nutricao.calorias} kcal
                </strong>
              </div>
              <Flame
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
            </div>

            {/* A meta calórica é o número que mais gera desconfiança: sem
                o motivo ao lado, parece arbitrário. */}
            <ExplicacaoAgent
              pergunta="Como cheguei nessas calorias?"
              explicacao={planoAtivo.conteudo.nutricao.explicacoes?.calorias}
            />

            <div
              className="flex h-3 overflow-hidden rounded-full bg-surface-container-high"
              aria-label={`${planoAtivo.conteudo.nutricao.proteinaG} gramas de proteína, ${planoAtivo.conteudo.nutricao.carboidratosG} gramas de carboidratos e ${planoAtivo.conteudo.nutricao.gordurasG} gramas de gorduras`}
            >
              <span
                className={`h-full ${CORES_MACRO.proteina}`}
                style={{
                  flex: planoAtivo.conteudo.nutricao.proteinaG * 4,
                }}
              />
              <span
                className={`h-full ${CORES_MACRO.carboidratos}`}
                style={{
                  flex: planoAtivo.conteudo.nutricao.carboidratosG * 4,
                }}
              />
              <span
                className={`h-full ${CORES_MACRO.gorduras}`}
                style={{
                  flex: planoAtivo.conteudo.nutricao.gordurasG * 9,
                }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-body-sm">
              <div>
                <span className={`mb-1 block size-2 rounded-full ${CORES_MACRO.proteina}`} />
                <strong className="tabular-nums">
                  {planoAtivo.conteudo.nutricao.proteinaG} g
                </strong>
                <span className="block text-muted-foreground">Proteína</span>
              </div>
              <div>
                <span className={`mb-1 block size-2 rounded-full ${CORES_MACRO.carboidratos}`} />
                <strong className="tabular-nums">
                  {planoAtivo.conteudo.nutricao.carboidratosG} g
                </strong>
                <span className="block text-muted-foreground">Carboidratos</span>
              </div>
              <div>
                <span className={`mb-1 block size-2 rounded-full ${CORES_MACRO.gorduras}`} />
                <strong className="tabular-nums">
                  {planoAtivo.conteudo.nutricao.gordurasG} g
                </strong>
                <span className="block text-muted-foreground">Gorduras</span>
              </div>
            </div>
          </ResumoMacros>
          </MetaNutricional>
        </CartaoPlanoAtivo>
        </>
      ) : !resumo.modoConservador ? (
        <section
          aria-labelledby="plano-pronto-titulo"
          className="flex flex-col overflow-hidden rounded-2xl border-2 border-border-strong bg-surface-container"
        >
          <div className="flex flex-col gap-5 p-5">
            <div className="flex size-12 items-center justify-center rounded-full bg-on-surface-strong text-background">
              <Dumbbell className="size-6" aria-hidden="true" />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-label-md font-semibold tracking-wide text-muted-foreground uppercase">
                Próxima etapa
              </p>
              <h2
                id="plano-pronto-titulo"
                className="text-headline-sm font-bold text-on-surface-strong"
              >
                Seu perfil está pronto
              </h2>
              <p className="text-body-md leading-relaxed text-muted-foreground">
                Vamos montar seu Bloco de Treino e suas metas nutricionais com
                base nas respostas da triagem.
              </p>
            </div>
          </div>

          <Button
            asChild
            size="lg"
            className="h-14 w-full rounded-none text-base font-bold"
          >
            <Link href="/plano/gerando">
              Gerar meu Plano Ativo
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </Button>
        </section>
      ) : null}

      </div>
    </TelaConteudo>
  );
}
