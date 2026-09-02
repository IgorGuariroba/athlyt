import { Card } from "@/components/ui/card";
import {
  calcularEscalaDePeso,
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
 * escolhido, mesmo que não haja medição alguma no meio. É o que
 * permite ler adiantamento e atraso — a distância vertical entre a
 * polilinha e a rampa da meta.
 *
 * A rampa é tracejada porque é promessa, não medição; a polilinha é
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
// Os pontos das pontas têm raio 3: sem folga lateral, o primeiro e o
// último seriam cortados ao meio pela borda do viewBox.
const MARGEM_X = 4;
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

  const alturaDe = (pesoKg: number) =>
    MARGEM_Y +
    (1 - (pesoKg - escala.pisoKg) / (escala.tetoKg - escala.pisoKg)) *
      (ALTURA - MARGEM_Y * 2);

  const projetar = ({ data, pesoKg }: MedicaoPeso) => ({
    x:
      PLOT_ESQUERDA +
      ((data.getTime() - plano.inicio.getTime()) / janela) *
        (PLOT_DIREITA - PLOT_ESQUERDA),
    y: alturaDe(pesoKg),
  });

  const pontos = plano.medicoes.map((medicao) => ({
    ...medicao,
    ...projetar(medicao),
  }));
  const atual = plano.medicoes[plano.medicoes.length - 1];
  const linhaMeta = plano.linhaMeta?.map(projetar) ?? null;

  const resumo = [
    `Peso em quilogramas de ${formatarData(plano.inicio)} a ${formatarData(plano.fim)}.`,
    // A grade também é informação: sem isto, quem lê por voz perde a
    // escala contra a qual as linhas devem ser interpretadas.
    `Eixo vertical de ${formatarPeso(escala.pisoKg)} a ${formatarPeso(escala.tetoKg)} kg.`,
    `Peso inicial ${formatarPeso(plano.medicoes[0].pesoKg)} kg, atual ${formatarPeso(atual.pesoKg)} kg, em ${plano.medicoes.length} ${plano.medicoes.length === 1 ? "registro" : "registros"}.`,
    pesoMetaKg === undefined
      ? "Sem meta registrada."
      : `Meta ${formatarPeso(pesoMetaKg)} kg em 120 dias.`,
  ].join(" ");

  return (
    <Card className={cn("px-5", className)}>
    <figure className="flex flex-col gap-3">
      <Cabecalho valor={atual.pesoKg} />

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
            cx={x}
            cy={y}
            r="3"
            className="fill-on-surface-strong"
          />
        ))}
      </svg>

      {/* A faixa de valores saiu daqui: as marcas do eixo Y já a
          declaram, e repeti-la seria ruído. Sobram as datas das pontas,
          que o eixo X não rotula. O recuo alinha a primeira data ao
          início do plot, não à calha dos rótulos. */}
      <figcaption
        className="flex items-baseline justify-between gap-3 text-caption tabular-nums text-muted-foreground"
        style={{ paddingLeft: `${(PLOT_ESQUERDA / LARGURA) * 100}%` }}
      >
        <span>{formatarData(plano.inicio)}</span>
        <span>{formatarData(plano.fim)}</span>
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
            Meta em 120 dias
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

function Cabecalho({ valor }: { valor: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      {/* Um `figure` admite um único `figcaption`, reservado aqui ao
          rodapé de eixos. O título é um `span`, como em
          `GraficoTendencia`. */}
      <span className="min-w-0 truncate text-label-lg text-on-surface-strong">
        Peso
      </span>
      <span className="shrink-0 text-label-lg tabular-nums text-on-surface-strong">
        {formatarPeso(valor)}{" "}
        <span className="text-body-sm font-normal text-muted-foreground">
          kg
        </span>
      </span>
    </div>
  );
}
