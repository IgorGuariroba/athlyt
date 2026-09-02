import { Card } from "@/components/ui/card";
import {
  calcularEscalaDePeso,
  calcularMarcasDeTempo,
  descreverDistanciaAMeta,
  HORIZONTE_META_DIAS,
  montarPlanoDePeso,
  type HorizonteDias,
  type MedicaoPeso,
} from "@/domain/medicoes/plano-peso";
import { cn } from "@/lib/utils";

/**
 * Gráfico de peso do Progresso: onde comecei, para onde vou, onde estou.
 *
 * Distinto de `GraficoTendencia`, que desenha séries observadas em
 * escala derivada dos próprios dados. Aqui o eixo do tempo é **o
 * plano**, não os dados: começa no peso inicial e vai até o horizonte
 * escolhido, mesmo que não haja medição alguma no meio.
 *
 * A tracejada é o **ritmo médio até a meta**: a interpolação linear
 * entre peso inicial e meta, ou seja, onde o ritmo médio necessário
 * estaria em cada data. Não é uma prescrição diária, e o gráfico não
 * afirma atraso nem adiantamento — nada no sistema classifica progresso
 * por desvio contra ela (a Revisão Semanal pontua tendência corporal
 * por cintura, sem usar peso). Peso diário oscila com hidratação,
 * glicogênio e sódio o bastante para que uma diferença pontual contra
 * a reta não seja sinal.
 *
 * Ela é tracejada porque é referência, não medição; a polilinha é
 * sólida e traz um ponto por medição, para que o desenho não sugira
 * leituras contínuas que ninguém fez.
 *
 * **Controlado, e sem `"use client"`.** O recorte chega pronto por
 * prop: o seletor é irmão na tela, não filho daqui
 * (`PainelGraficoPeso` é quem guarda o estado). Assim o desenho — que
 * é pura projeção de dados em SVG — não precisa de interatividade nem
 * vai para o bundle do cliente por conta própria.
 */
const LARGURA = 320;
const ALTURA = 140;
const MARGEM_Y = 12;
// O anel do alvo tem raio 4 e traço de 2: sem esta folga, ele seria
// cortado ao meio pela borda direita do viewBox quando cai no fim do
// eixo. Vale também para os pontos das medições nas pontas (raio 3).
const MARGEM_X = 6;
// Coluna reservada aos rótulos do eixo Y, à esquerda do plot.
//
// Fora da área de desenho, e não sobreposta a ela: a rampa da meta
// atravessa o gráfico partindo do topo-esquerdo, exatamente onde um
// rótulo sobreposto cairia. No tema escuro, texto sobre linha
// tracejada fica ilegível sem halo.
const CALHA_Y = 34;
const PLOT_ESQUERDA = CALHA_Y + MARGEM_X;
const PLOT_DIREITA = LARGURA - MARGEM_X;

const formatarData = (data: Date) =>
  data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const formatarPeso = (kg: number) =>
  kg.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function GraficoPeso({
  medicoes,
  pesoMetaKg,
  horizonteDias = 30,
  agora = new Date(),
  className,
}: {
  medicoes: readonly MedicaoPeso[];
  pesoMetaKg?: number;
  horizonteDias?: HorizonteDias;
  /** Injetável para manter story e teste independentes do relógio. */
  agora?: Date;
  className?: string;
}) {
  const plano = montarPlanoDePeso({
    medicoes,
    pesoMetaKg,
    horizonteDias,
    agora,
  });

  if (!plano) {
    // Sem série não há `figure`, porque não há figura. O convite a
    // registrar o primeiro peso é a única leitura possível aqui.
    return (
      <Card className={cn("gap-3 px-5", className)}>
        <span className="text-label-lg text-on-surface-strong">Peso</span>
        <p className="text-body-sm leading-relaxed text-muted-foreground">
          Registre seu peso para acompanhar a evolução até a meta.
        </p>
      </Card>
    );
  }

  // A escala vem do domínio: marcas redondas que enquadram os dados,
  // em vez de extremos crus mais uma folga percentual.
  const escala = calcularEscalaDePeso(plano);
  const janela = plano.fim.getTime() - plano.inicio.getTime() || 1;
  const marcasDeTempo = calcularMarcasDeTempo(plano);

  const alturaDe = (pesoKg: number) =>
    MARGEM_Y +
    (1 - (pesoKg - escala.pisoKg) / (escala.tetoKg - escala.pisoKg)) *
      (ALTURA - MARGEM_Y * 2);

  const larguraDe = (data: Date) =>
    PLOT_ESQUERDA +
    ((data.getTime() - plano.inicio.getTime()) / janela) *
      (PLOT_DIREITA - PLOT_ESQUERDA);

  const projetar = ({ data, pesoKg }: MedicaoPeso) => ({
    x: larguraDe(data),
    y: alturaDe(pesoKg),
  });

  const pontos = plano.medicoes.map((medicao) => ({
    ...medicao,
    ...projetar(medicao),
  }));
  const atual = plano.medicoes[plano.medicoes.length - 1];
  const linhaMeta = plano.linhaMeta?.map(projetar) ?? null;

  // O alvo só é marcável quando o dia 120 cabe na janela. Nos recortes
  // de 30 e 90 dias a rampa termina num ponto **interpolado** — onde o
  // ritmo médio passa naquela data — e marcá-lo anunciaria como
  // destino um valor que não é a meta. Com prazo vencido a linha segue
  // horizontal depois do alvo, e o marcador fica no dia 120, não na
  // ponta da linha.
  const dataAlvo = new Date(
    plano.inicio.getTime() + HORIZONTE_META_DIAS * 24 * 60 * 60 * 1000,
  );
  const alvo =
    pesoMetaKg !== undefined && dataAlvo <= plano.fim
      ? projetar({ data: dataAlvo, pesoKg: pesoMetaKg })
      : null;

  const distancia =
    pesoMetaKg === undefined
      ? null
      : descreverDistanciaAMeta({
          pesoInicialKg: plano.medicoes[0].pesoKg,
          pesoAtualKg: atual.pesoKg,
          pesoMetaKg,
        });

  const resumo = [
    `Peso em quilogramas de ${formatarData(plano.inicio)} a ${formatarData(plano.fim)}.`,
    // A grade também é informação: sem isto, quem lê por voz perde a
    // escala contra a qual as linhas devem ser interpretadas.
    `Eixo vertical de ${formatarPeso(escala.pisoKg)} a ${formatarPeso(escala.tetoKg)} kg.`,
    `Peso inicial ${formatarPeso(plano.medicoes[0].pesoKg)} kg, atual ${formatarPeso(atual.pesoKg)} kg, em ${plano.medicoes.length} ${plano.medicoes.length === 1 ? "registro" : "registros"}.`,
    pesoMetaKg === undefined
      ? "Sem meta registrada."
      : `Ritmo médio até a meta de ${formatarPeso(pesoMetaKg)} kg em 120 dias. ${distancia}.`,
  ].join(" ");

  return (
    <Card className={cn("px-5", className)}>
    <figure className="flex flex-col gap-3">
      <Cabecalho valor={atual.pesoKg} distancia={distancia} />

      {/* Sem `preserveAspectRatio="none"`: esticar o viewBox achataria
          os pontos das medições em elipses. O gráfico escala
          uniformemente e os pontos permanecem circulares. */}
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        role="img"
        aria-label={resumo}
        className="h-36 w-full"
      >
        {escala.marcas.map((marca) => {
          const y = alturaDe(marca);
          return (
            <g key={marca}>
              <line
                x1={CALHA_Y}
                x2={LARGURA}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={CALHA_Y - 6}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {formatarPeso(marca)}
              </text>
            </g>
          );
        })}

        {linhaMeta ? (
          <polyline
            points={linhaMeta.map(({ x, y }) => `${x},${y}`).join(" ")}
            fill="none"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinecap="round"
            className="stroke-muted-foreground"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {pontos.length > 1 ? (
          <polyline
            points={pontos.map(({ x, y }) => `${x},${y}`).join(" ")}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-on-surface-strong"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {pontos.map(({ x, y, data }) => (
          <circle
            key={data.getTime()}
            data-slot="medicao"
            cx={x}
            cy={y}
            r="3"
            className="fill-on-surface-strong"
          />
        ))}

        {/* Anel vazado, e não um ponto cheio: os pontos cheios são
            medições reais, e o alvo é uma intenção. Repetir o mesmo
            marcador diria que alguém já pesou aquilo. */}
        {alvo ? (
          <circle
            data-slot="alvo"
            cx={alvo.x}
            cy={alvo.y}
            r="4"
            fill="none"
            strokeWidth="2"
            className="stroke-muted-foreground"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>

      {/* A faixa de valores saiu daqui: as marcas do eixo Y já a
          declaram, e repeti-la seria ruído. Restam as datas, que o eixo
          X não desenha.

          Rotular só as pontas fazia o miolo parecer vazio: entre "07 de
          ago." e "05 de dez." não havia como situar uma data, e num
          plano de 120 dias quase toda a largura é miolo. As marcas
          intermediárias dão a escala do tempo, como as do eixo Y dão a
          do peso.

          Posicionadas por porcentagem sobre a mesma projeção do SVG, e
          não por `justify-between`: um flex distribuiria os rótulos
          uniformemente na caixa, deslocando-os do instante que nomeiam.
          As pontas ancoram por dentro (a primeira pela borda esquerda,
          a última pela direita) para não vazarem do cartão; as do meio
          centram no próprio x. */}
      <figcaption className="relative h-3.5 text-caption tabular-nums text-muted-foreground">
        {marcasDeTempo.map((data, indice) => {
          const x = larguraDe(data);
          const ultima = indice === marcasDeTempo.length - 1;
          return (
            <span
              key={data.getTime()}
              className={cn(
                "absolute top-0 whitespace-nowrap",
                indice === 0 ? null : ultima ? "-translate-x-full" : "-translate-x-1/2",
              )}
              style={{ left: `${(x / LARGURA) * 100}%` }}
            >
              {formatarData(data)}
            </span>
          );
        })}
      </figcaption>

      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        <li className="flex items-center gap-2 text-body-sm text-muted-foreground">
          <span
            aria-hidden="true"
            className="h-0.5 w-4 shrink-0 rounded-pill bg-on-surface-strong"
          />
          Medido
          <span className="tabular-nums text-on-surface">
            {formatarPeso(atual.pesoKg)} kg
          </span>
        </li>
        {pesoMetaKg === undefined ? null : (
          <li className="flex items-center gap-2 text-body-sm text-muted-foreground">
            <span
              aria-hidden="true"
              className="h-0.5 w-4 shrink-0 rounded-pill bg-muted-foreground opacity-60"
            />
            {/* "Ritmo médio", e não "meta": a linha é a interpolação
                linear entre peso inicial e meta — onde o ritmo médio
                necessário estaria em cada data. Não é uma prescrição
                diária, e nada no sistema classifica atraso ou
                adiantamento a partir dela: a Revisão Semanal pontua
                tendência corporal por cintura, sem usar peso. */}
            Ritmo médio até a meta
            <span className="tabular-nums text-on-surface">
              {formatarPeso(pesoMetaKg)} kg
            </span>
          </li>
        )}
      </ul>
    </figure>
    </Card>
  );
}

function Cabecalho({
  valor,
  distancia,
}: {
  valor: number;
  distancia: string | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="flex min-w-0 flex-col">
        {/* Um `figure` admite um único `figcaption`, reservado aqui ao
            rodapé de eixos. O título é um `span`, como em
            `GraficoTendencia`. */}
        <span className="truncate text-label-lg text-on-surface-strong">
          Peso
        </span>
        {/* A resposta a "como estou indo" fica junto do título, em
            hierarquia menor: é leitura derivada, não medição. */}
        {distancia ? (
          <span className="truncate text-body-sm tabular-nums text-muted-foreground">
            {distancia}
          </span>
        ) : null}
      </div>
      <span className="shrink-0 text-label-lg tabular-nums text-on-surface-strong">
        {formatarPeso(valor)}{" "}
        <span className="text-body-sm font-normal text-muted-foreground">
          kg
        </span>
      </span>
    </div>
  );
}
