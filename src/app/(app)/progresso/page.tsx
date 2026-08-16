import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Camera,
  Download,
  Plus,
  Ruler,
  Sparkles,
} from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  CabecalhoSecao,
  CabecalhoTela,
  calcularDeltaTendencia,
  CartaoLista,
  ControleSegmentado,
  EstadoVazio,
  ItemNavegacao,
  LinhaTempoProgresso,
  ListaNavegacao,
  Metrica,
  NotaTela,
  PainelMetricas,
  SecoesTela,
  SeloVariacao,
  SparklineTendencia,
  TelaConteudo,
} from "@/components/tela";
import type { MetaProporcao } from "@/domain/medicoes";
import { obterPanoramaCorporal } from "@/domain/medicoes/repositorio";
import { obterReavaliacaoPendente } from "@/domain/plano/reavaliacao";
import { atualizarEnfasesCorporais } from "./actions";
import { EnfasesCorporais } from "./enfases-corporais";

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

const DIRECAO: Record<MetaProporcao["direcao"], string> = {
  aumentar: "Aumentar",
  reduzir: "Reduzir",
  manter: "Manter",
};

function rotuloLado(regiao: string, lado: string): string {
  const feminino = regiao === "coxa" || regiao === "panturrilha";
  if (lado === "direito") return feminino ? "direita" : "direito";
  if (lado === "esquerdo") return feminino ? "esquerda" : "esquerdo";
  return lado;
}

const formatar = (valor: number, casas = 1) =>
  valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

const cm = (mm: number) => mm / 10;

type PontoTendencia = { data: Date; valor: number };
type EventoProgresso = { data: Date; titulo: string; detalhe?: string };

type MetricaCorporal = {
  chave: string;
  titulo: string;
  unidade: string;
  cor: string;
  serie: PontoTendencia[];
  meta?: {
    direcao: MetaProporcao["direcao"];
    cicloMm: number;
    minMm: number;
    maxMm: number;
  };
};

/**
 * A aba Progresso funciona como um boletim: começa pela interpretação da
 * janela, ancora a leitura em números-chave e deixa registros e metas abaixo.
 * O plano não muda nesta tela; o fechamento natural é a Revisão Semanal.
 */
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

  const [panorama, reavaliacaoPendente] = await Promise.all([
    obterPanoramaCorporal(session.user.id),
    obterReavaliacaoPendente(session.user.id),
  ]);

  // A janela termina no registro mais recente, não em hoje. Assim quem passou
  // algumas semanas sem medir ainda enxerga seu último período comparável.
  const referencia = Math.max(
    0,
    ...panorama.pesos.map((item) => item.observadoEm.getTime()),
    ...panorama.medicoes.map((item) => item.observadoEm.getTime()),
    ...panorama.gorduras.map((item) => item.observadoEm.getTime()),
  );
  const desde = referencia - dias * DIA_MS;
  const metasPorRegiao = new Map(
    panorama.metas.map((meta) => [meta.regiao, meta]),
  );

  const peso: MetricaCorporal = {
    chave: "peso",
    titulo: "Peso",
    unidade: "kg",
    cor: "text-nutrition-calories",
    serie: panorama.pesos
      .filter((item) => item.observadoEm.getTime() >= desde)
      .map((item) => ({
        data: item.observadoEm,
        valor: item.pesoGramas / 1000,
      }))
      .sort((a, b) => a.data.getTime() - b.data.getTime()),
  };

  const gorduras: MetricaCorporal[] = [
    ...Map.groupBy(
      panorama.gorduras.filter(
        (item) => item.observadoEm.getTime() >= desde,
      ),
      (item) => `${item.metodo}${item.protocolo ? ` · ${item.protocolo}` : ""}`,
    ).entries(),
  ].map(([metodo, itens], indice) => ({
    chave: `gordura:${metodo}`,
    titulo: `Gordura · ${metodo}`,
    unidade: "%",
    cor: indice % 2 ? "text-nutrition-protein" : "text-data-violet",
    serie: itens
      .map((item) => ({
        data: item.observadoEm,
        valor: item.percentualBasisPoints / 100,
      }))
      .sort((a, b) => a.data.getTime() - b.data.getTime()),
  }));

  const circunferencias: MetricaCorporal[] = [
    ...Map.groupBy(
      panorama.medicoes.filter(
        (item) => item.observadoEm.getTime() >= desde,
      ),
      (item) => `${item.regiao}:${item.lado}`,
    ).entries(),
  ].map(([chave, itens], indice) => {
    const [regiao, lado] = chave.split(":");
    const meta = metasPorRegiao.get(regiao);
    const tituloBase = ROTULO_REGIAO[regiao] ?? regiao;
    return {
      chave: `circunferencia:${chave}`,
      titulo:
        lado === "unico" ? tituloBase : `${tituloBase} ${rotuloLado(regiao, lado)}`,
      unidade: "cm",
      cor:
        indice % 2 ? "text-nutrition-protein" : "text-nutrition-carbs",
      serie: itens
        .map((item) => ({
          data: item.observadoEm,
          valor: cm(item.valorMm),
        }))
        .sort((a, b) => a.data.getTime() - b.data.getTime()),
      meta: meta
        ? {
            direcao: meta.direcao,
            cicloMm: meta.metaCicloMm,
            minMm: meta.faixaMinMm,
            maxMm: meta.faixaMaxMm,
          }
        : undefined,
    };
  });

  const metricas = [peso, ...gorduras, ...circunferencias].filter(
    (metrica) => metrica.serie.length > 0,
  );
  const gordura = gorduras[0];
  const cintura = circunferencias.find((metrica) =>
    metrica.chave.startsWith("circunferencia:cintura"),
  );
  const eventos: EventoProgresso[] = metricas
    .flatMap((metrica) =>
      metrica.serie.slice(-3).map((ponto) => ({
        data: ponto.data,
        titulo: metrica.titulo,
        detalhe: `${formatar(ponto.valor)} ${metrica.unidade}`,
      })),
    )
    .sort((a, b) => b.data.getTime() - a.data.getTime())
    .slice(0, 12);
  const visual = panorama.avaliacoesVisuais.find((item) => item.ativa);
  const frase = descreverBoletim(peso, cintura, dias);

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Progresso"
        titulo="Boletim corporal"
        descricao={frase}
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
        <div className="flex justify-end">
          <ControleSegmentado
            rotulo="Janela do boletim"
            opcoes={PERIODOS.map((valor) => ({
              valor: String(valor),
              rotulo: `${valor}d`,
              href: `/progresso?periodo=${valor}`,
              ativo: dias === valor,
            }))}
          />
        </div>

        {metricas.length === 0 ? (
          <EstadoVazio
            Icone={Ruler}
            titulo="Sem boletim nesta janela"
            descricao={`Nenhum registro comparável nos últimos ${dias} dias.`}
            acao={
              <Button asChild variant="secondary">
                <Link href="/diario/medicoes">Registrar medição</Link>
              </Button>
            }
          />
        ) : (
          <PainelMetricas>
            <Metrica
              valor={
                peso.serie.length
                  ? formatar(peso.serie[peso.serie.length - 1].valor)
                  : "—"
              }
              unidade=" kg"
              rotulo="Peso"
            />
            <Metrica
              valor={
                gordura?.serie.length
                  ? formatar(gordura.serie[gordura.serie.length - 1].valor)
                  : "—"
              }
              unidade=" %"
              rotulo="Gordura"
            />
            <Metrica
              valor={
                cintura?.serie.length
                  ? formatar(cintura.serie[cintura.serie.length - 1].valor)
                  : "—"
              }
              unidade=" cm"
              rotulo="Cintura"
            />
          </PainelMetricas>
        )}

        {peso.serie.length ? (
          <CartaoLista className="flex flex-col gap-3 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-label-lg text-on-surface-strong">
                Peso de tendência
              </span>
              <SeloVariacao
                delta={calcularDeltaTendencia(peso.serie)}
                unidade="kg"
                porSemana
              />
            </div>
            <SparklineTendencia
              serie={peso.serie}
              cor={peso.cor}
              className="h-14"
            />
          </CartaoLista>
        ) : null}

        {metricas.length ? (
          <section aria-labelledby="o-que-mudou" className="flex flex-col gap-3">
            <CabecalhoSecao
              id="o-que-mudou"
              titulo="O que mudou"
              descricao="Variação suavizada por métrica na janela selecionada."
            />
            <CartaoLista aria-label="Variação por métrica">
              <ul className="divide-y divide-border">
                {metricas.map((metrica) => (
                  <li
                    key={metrica.chave}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">
                      {metrica.titulo}
                    </span>
                    <SeloVariacao
                      delta={calcularDeltaTendencia(metrica.serie)}
                      unidade={metrica.unidade}
                      className="shrink-0"
                    />
                  </li>
                ))}
              </ul>
            </CartaoLista>
          </section>
        ) : null}

        {circunferencias.some((metrica) => metrica.meta) ? (
          <section aria-labelledby="direcao-ciclo" className="flex flex-col gap-3">
            <CabecalhoSecao
              id="direcao-ciclo"
              titulo="Direção do ciclo"
              descricao="Alvos de proporção derivados das suas medidas."
            />
            <CartaoLista aria-label="Metas de proporção">
              <ul className="divide-y divide-border">
                {circunferencias.map((metrica) =>
                  metrica.meta ? (
                    <li
                      key={metrica.chave}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">
                        {metrica.titulo}
                      </span>
                      <span className="text-caption text-muted-foreground uppercase">
                        {DIRECAO[metrica.meta.direcao]}
                      </span>
                      <span className="shrink-0 text-label-lg tabular-nums text-on-surface-strong">
                        {formatar(cm(metrica.meta.cicloMm))}
                        <span className="text-caption font-normal text-muted-foreground">
                          {" "}cm
                        </span>
                      </span>
                    </li>
                  ) : null,
                )}
              </ul>
            </CartaoLista>
            <EnfasesCorporais action={atualizarEnfasesCorporais} />
          </section>
        ) : (
          <EnfasesCorporais action={atualizarEnfasesCorporais} />
        )}

        {eventos.length ? (
          <section aria-labelledby="historico" className="flex flex-col gap-3">
            <CabecalhoSecao
              id="historico"
              titulo="Histórico"
              descricao="Últimos registros, em ordem."
            />
            <CartaoLista className="px-2 py-2">
              <LinhaTempoProgresso eventos={eventos} />
            </CartaoLista>
          </section>
        ) : null}

        <ListaNavegacao aria-label="Registro visual">
          <ItemNavegacao
            href="/progresso/fotos"
            Icone={Camera}
            rotulo="Comparar fotos"
            descricao="Mesma pose ao longo do tempo"
          />
          <ItemNavegacao
            href="/progresso/avaliacao-visual"
            Icone={Sparkles}
            rotulo="Avaliação visual"
            descricao="Critérios separados, sem nota única"
            valor={
              visual
                ? `${formatar(visual.gorduraMinBasisPoints / 100)}–${formatar(visual.gorduraMaxBasisPoints / 100)}%`
                : undefined
            }
          />
        </ListaNavegacao>

        {reavaliacaoPendente ? (
          <CartaoLista className="p-4">
            <strong className="text-label-lg text-on-surface-strong">
              Reavaliação pendente
            </strong>
            <p className="mt-1 text-body-sm leading-relaxed text-muted-foreground">
              Seu objetivo mudou. O Plano Ativo permanece igual até a próxima
              Revisão Semanal apresentar uma proposta para sua aprovação.
            </p>
          </CartaoLista>
        ) : null}

        <Button asChild size="cta">
          <Link href="/progresso/revisao">
            Iniciar ou revisar
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>

        <Button asChild variant="ghost" className="w-full">
          <a href="/api/avaliacao-corporal/exportar" download>
            <Download aria-hidden="true" />
            Exportar meus dados corporais
          </a>
        </Button>
      </SecoesTela>

      <NotaTela>
        O boletim descreve o que os registros mostram; ele não altera o Plano
        Ativo. Séries de métodos diferentes não são convertidas entre si.
      </NotaTela>
    </TelaConteudo>
  );
}

function descreverBoletim(
  peso: MetricaCorporal,
  cintura: MetricaCorporal | undefined,
  dias: number,
): string {
  const variacaoPeso = calcularDeltaTendencia(peso.serie);
  if (!variacaoPeso) {
    return `Nos últimos ${dias} dias não há série de peso comparável — a leitura corporal fica limitada.`;
  }

  const ritmo = formatar(Math.abs(variacaoPeso.porDia * 7), 2);
  const rumo =
    variacaoPeso.direcao === "estavel"
      ? "estável"
      : variacaoPeso.direcao === "alta"
        ? `subindo ${ritmo} kg por semana`
        : `caindo ${ritmo} kg por semana`;
  const variacaoCintura = cintura
    ? calcularDeltaTendencia(cintura.serie)
    : null;
  const complemento = variacaoCintura
    ? ` A cintura ${
        variacaoCintura.direcao === "estavel"
          ? "não se moveu"
          : variacaoCintura.direcao === "alta"
            ? "acompanhou para cima"
            : "acompanhou para baixo"
      } em ${formatar(Math.abs(variacaoCintura.absoluto))} cm.`
    : "";

  return `Em ${variacaoPeso.dias} dias, seu peso de tendência está ${rumo}.${complemento}`;
}
