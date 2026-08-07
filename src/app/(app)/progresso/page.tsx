import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Camera,
  ChartNoAxesCombined,
  Download,
  Plus,
  Ruler,
  Scale,
  Sparkles,
} from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  BarraFaixa,
  CabecalhoSecao,
  CabecalhoTela,
  CartaoLista,
  ControleSegmentado,
  GraficoTendencia,
  LinhaCartaoLista,
  LinhasCartaoLista,
  NotaTela,
  Revelar,
  SecoesTela,
  TelaConteudo,
  type PontoSerie,
} from "@/components/tela";
import type { MetaProporcao } from "@/domain/medicoes";
import { obterPanoramaCorporal } from "@/domain/medicoes/repositorio";
import { atualizarEnfasesCorporais } from "./actions";
import { EnfasesCorporais } from "./enfases-corporais";

/**
 * Aba Progresso (telas 064–065): metas de proporção, tendência
 * corporal e as portas para fotos, avaliação visual e Revisão Semanal.
 *
 * A tela é densa por natureza — várias séries, várias regiões — então
 * segue o agrupamento de DESIGN.md > Components > Card: um cartão por
 * unidade de informação, com linhas separadas por divisor, em vez de
 * um cartão por item. O período vive na URL para que a tela continue
 * endereçável e renderizada no servidor.
 */
const PERIODOS = [30, 90, 365] as const;
const DIA_MS = 86_400_000;

const ROTULO_REGIAO: Record<string, string> = {
  cintura: "Cintura",
  pescoco: "Pescoço",
  quadril: "Quadril",
  torax: "Tórax",
  ombros: "Ombros",
  braco: "Braço",
  coxa: "Coxa",
  panturrilha: "Panturrilha",
  punho: "Punho",
  tornozelo: "Tornozelo",
};

/**
 * Regiões bilaterais e o gênero do seu rótulo — "braço direito", mas
 * "coxa direita". Concordância errada em uma tela que fala de corpo
 * soa a texto gerado, não a produto.
 */
const BILATERAIS = [
  { regiao: "braco", plural: "Braços", direito: "Direito", esquerdo: "Esquerdo" },
  { regiao: "coxa", plural: "Coxas", direito: "Direita", esquerdo: "Esquerda" },
  {
    regiao: "panturrilha",
    plural: "Panturrilhas",
    direito: "Direita",
    esquerdo: "Esquerda",
  },
] as const;

const DIRECAO: Record<MetaProporcao["direcao"], string> = {
  aumentar: "Aumentar",
  reduzir: "Reduzir",
  manter: "Manter",
};

const cm = (mm: number) => mm / 10;
const formatarCm = (mm: number) =>
  cm(mm).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export default async function ProgressoPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { periodo } = await searchParams;
  const dias = PERIODOS.includes(Number(periodo) as (typeof PERIODOS)[number])
    ? Number(periodo)
    : 90;

  const panorama = await obterPanoramaCorporal(session.user.id);

  // A janela conta a partir do registro mais recente, e não de hoje:
  // quem passou um mês sem medir veria todos os gráficos vazios.
  const referencia = Math.max(
    0,
    ...panorama.pesos.map((item) => item.observadoEm.getTime()),
    ...panorama.medicoes.map((item) => item.observadoEm.getTime()),
    ...panorama.gorduras.map((item) => item.observadoEm.getTime()),
  );
  const desde = referencia - dias * DIA_MS;

  const metas = [...new Map(panorama.metas.map((m) => [m.regiao, m])).values()];
  const pesosPeriodo = panorama.pesos.filter(
    (item) => item.observadoEm.getTime() >= desde,
  );
  const medicoesPeriodo = panorama.medicoes.filter(
    (item) => item.observadoEm.getTime() >= desde,
  );
  const gordurasPorMetodo = [
    ...Map.groupBy(
      panorama.gorduras.filter((item) => item.observadoEm.getTime() >= desde),
      (item) => `${item.metodo}${item.protocolo ? ` · ${item.protocolo}` : ""}`,
    ).entries(),
  ];

  const serieDeMedicoes = (regiao: string, lado: string): PontoSerie[] =>
    medicoesPeriodo
      .filter((item) => item.regiao === regiao && item.lado === lado)
      .map((item) => ({ data: item.observadoEm, valor: cm(item.valorMm) }));

  // Cada gráfico é uma comparação: lados de uma mesma região dividem
  // o eixo, para que a assimetria seja legível na própria escala.
  const circunferencias = [
    {
      titulo: "Cintura",
      series: [
        {
          valores: serieDeMedicoes("cintura", "unico"),
          cor: "text-nutrition-carbs",
        },
      ],
    },
    ...BILATERAIS.map((item) => ({
      titulo: item.plural,
      series: [
        {
          nome: item.direito,
          valores: serieDeMedicoes(item.regiao, "direito"),
          cor: "text-nutrition-carbs",
        },
        {
          nome: item.esquerdo,
          valores: serieDeMedicoes(item.regiao, "esquerdo"),
          cor: "text-nutrition-protein",
        },
      ],
    })),
  ].filter((grafico) =>
    grafico.series.some((serie) => serie.valores.length > 1),
  );

  const visual = panorama.avaliacoesVisuais.find((item) => item.ativa);
  const semTendencia =
    pesosPeriodo.length < 2 &&
    circunferencias.length === 0 &&
    gordurasPorMetodo.length === 0;

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Progresso"
        titulo="Sua resposta corporal"
        descricao="Medidas, tendência e proporções ao longo do tempo. Um ponto isolado não é resposta corporal."
        acao={
          <Button asChild size="sm" variant="secondary">
            <Link href="/diario/medicoes">
              <Plus aria-hidden="true" />
              Registrar
            </Link>
          </Button>
        }
      />

      <SecoesTela>
        <section aria-labelledby="metas-proporcao" className="flex flex-col gap-3">
          <CabecalhoSecao
            id="metas-proporcao"
            titulo="Metas de Proporção Corporal"
            descricao="Onde você está, o alvo deste ciclo e a faixa ideal de longo prazo, por região."
          />

          {metas.length ? (
            <CartaoLista aria-label="Metas por região">
              <LinhasCartaoLista>
                {/* A direção é o veredito da linha; atual, meta do ciclo
                    e faixa ideal vivem na legenda da régua, sem que
                    nenhum número apareça duas vezes. */}
                {metas.map((meta) => (
                  <LinhaCartaoLista
                    key={meta.id}
                    titulo={ROTULO_REGIAO[meta.regiao] ?? meta.regiao}
                    meta={`Confiança ${meta.confianca}`}
                    valor={
                      <span className="text-label-md font-semibold text-muted-foreground uppercase">
                        {DIRECAO[meta.direcao]}
                      </span>
                    }
                  >
                    <BarraFaixa
                      rotuloAcessivel={`${ROTULO_REGIAO[meta.regiao] ?? meta.regiao}: medida atual ${formatarCm(meta.atualMm)} cm; meta deste ciclo ${formatarCm(meta.metaCicloMm)} cm; faixa ideal de longo prazo de ${formatarCm(meta.faixaMinMm)} a ${formatarCm(meta.faixaMaxMm)} cm`}
                      atual={cm(meta.atualMm)}
                      min={cm(meta.faixaMinMm)}
                      max={cm(meta.faixaMaxMm)}
                      meta={cm(meta.metaCicloMm)}
                      unidade="cm"
                    />
                    <Revelar rotulo="Por que esta meta?">
                      {meta.justificativa} Metodologia {meta.metodologiaVersao}.
                    </Revelar>
                  </LinhaCartaoLista>
                ))}
              </LinhasCartaoLista>
            </CartaoLista>
          ) : (
            <EstadoVazio
              Icone={Ruler}
              titulo="Sem metas de proporção ainda"
              descricao="Registre circunferências para que o Athlyt derive uma trajetória personalizada por região."
              acao={
                <Button asChild variant="secondary">
                  <Link href="/diario/medicoes">Registrar circunferências</Link>
                </Button>
              }
            />
          )}

          <EnfasesCorporais action={atualizarEnfasesCorporais} />
        </section>

        <section
          aria-labelledby="tendencia-corporal"
          className="flex flex-col gap-3"
        >
          <CabecalhoSecao
            id="tendencia-corporal"
            titulo="Tendência corporal"
            acao={
              <ControleSegmentado
                rotulo="Período dos gráficos"
                opcoes={PERIODOS.map((valor) => ({
                  valor: String(valor),
                  rotulo: `${valor}d`,
                  href: `/progresso?periodo=${valor}`,
                  ativo: dias === valor,
                }))}
              />
            }
          />

          {semTendencia ? (
            <EstadoVazio
              Icone={ChartNoAxesCombined}
              titulo="Ainda sem série comparável"
              descricao={`Nenhuma métrica tem dois registros nos últimos ${dias} dias. Amplie o período ou registre uma nova medição.`}
            />
          ) : (
            <>
              <CartaoLista aria-label="Peso e composição" className="p-4">
                <div className="flex flex-col gap-6">
                  <GraficoTendencia
                    titulo="Peso"
                    unidade="kg"
                    series={[
                      {
                        cor: "text-nutrition-calories",
                        valores: pesosPeriodo.map((item) => ({
                          data: item.observadoEm,
                          valor: item.pesoGramas / 1000,
                        })),
                      },
                    ]}
                  />
                  {gordurasPorMetodo.map(([metodo, itens]) => (
                    <GraficoTendencia
                      key={metodo}
                      titulo={`Gordura · ${metodo}`}
                      unidade="%"
                      series={[
                        {
                          cor: "text-data-violet",
                          valores: itens.map((item) => ({
                            data: item.observadoEm,
                            valor: item.percentualBasisPoints / 100,
                          })),
                        },
                      ]}
                    />
                  ))}
                  {panorama.gorduras.length === 0 ? (
                    <p className="text-body-sm leading-relaxed text-muted-foreground">
                      Sem Medição de Gordura Corporal — ela é opcional, e cada
                      método permanece em série própria, sem conversão entre
                      protocolos.
                    </p>
                  ) : null}
                </div>
              </CartaoLista>

              {circunferencias.length ? (
                <CartaoLista aria-label="Circunferências" className="p-4">
                  <div className="flex flex-col gap-6">
                    {circunferencias.map((grafico) => (
                      <GraficoTendencia
                        key={grafico.titulo}
                        titulo={grafico.titulo}
                        unidade="cm"
                        series={grafico.series}
                      />
                    ))}
                  </div>
                </CartaoLista>
              ) : null}
            </>
          )}
        </section>

        <section aria-labelledby="registro-visual" className="flex flex-col gap-3">
          <CabecalhoSecao
            id="registro-visual"
            titulo="Registro visual"
            descricao={
              visual
                ? undefined
                : "Fotos privadas comparam a mesma pose ao longo do tempo, sem virar um percentual exato."
            }
          />

          <CartaoLista>
            {visual ? (
              <div className="flex flex-col gap-3 border-b border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-body-sm text-muted-foreground">
                      Gordura visual · faixa probabilística
                    </p>
                    <strong className="text-headline-md tabular-nums text-on-surface-strong">
                      {(visual.gorduraMinBasisPoints / 100).toLocaleString("pt-BR")}
                      –
                      {(visual.gorduraMaxBasisPoints / 100).toLocaleString("pt-BR")}
                      <span className="text-body-md font-normal text-muted-foreground">
                        {" "}
                        %
                      </span>
                    </strong>
                  </div>
                  <Sparkles
                    className="size-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-body-sm leading-relaxed text-muted-foreground">
                  Confiança {visual.confianca}. A faixa não substitui uma medição
                  e não altera o Plano Ativo sozinha.
                </p>
              </div>
            ) : null}

            <LinhasCartaoLista>
              <LinhaCartaoLista
                titulo="Comparar fotos"
                meta="Mesma pose, lado a lado, ao longo do tempo"
                valor={
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/progresso/fotos" aria-label="Comparar fotos">
                      <Camera aria-hidden="true" />
                      Abrir
                    </Link>
                  </Button>
                }
              />
              <LinhaCartaoLista
                titulo="Avaliação visual"
                meta="Critérios separados, sem nota corporal única"
                valor={
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      href="/progresso/avaliacao-visual"
                      aria-label="Avaliação visual"
                    >
                      <Sparkles aria-hidden="true" />
                      Abrir
                    </Link>
                  </Button>
                }
              />
            </LinhasCartaoLista>
          </CartaoLista>
        </section>

        <section
          aria-labelledby="revisao-semanal"
          className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface-container"
        >
          <div className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-on-surface-strong text-background">
                <Scale className="size-4" aria-hidden="true" />
              </span>
              <h2
                id="revisao-semanal"
                className="text-title font-bold text-on-surface-strong"
              >
                Revisão Semanal
              </h2>
            </div>
            <p className="text-body-md leading-relaxed text-muted-foreground">
              Compare planejado, realizado, resposta corporal e incertezas antes
              de ajustar o plano.
            </p>
          </div>
          <Button asChild size="cta" className="rounded-none">
            <Link href="/progresso/revisao">
              Iniciar ou revisar
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>

        <Button asChild variant="ghost" className="w-full">
          <a href="/api/avaliacao-corporal/exportar" download>
            <Download aria-hidden="true" />
            Exportar meus dados corporais
          </a>
        </Button>
      </SecoesTela>

      <NotaTela>
        Séries de métodos diferentes não são convertidas entre si: trocar de
        protocolo de medição muda a régua, não o corpo.
      </NotaTela>
    </TelaConteudo>
  );
}

/**
 * Estado vazio com explicação e, quando existe, o próximo passo
 * (DESIGN.md > Components > Empty, loading e locked states).
 */
function EstadoVazio({
  Icone,
  titulo,
  descricao,
  acao,
}: {
  Icone: typeof Ruler;
  titulo: string;
  descricao: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-surface-container/50 p-5">
      <Icone className="size-5 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <strong className="text-label-lg text-on-surface-strong">{titulo}</strong>
        <p className="text-body-sm leading-relaxed text-muted-foreground">
          {descricao}
        </p>
      </div>
      {acao}
    </div>
  );
}
