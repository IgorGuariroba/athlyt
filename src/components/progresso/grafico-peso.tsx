"use client";

import { useState } from "react";

import { SeletorSegmentado } from "@/components/tela";
import { Card } from "@/components/ui/card";
import {
  HORIZONTES_DISPONIVEIS,
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
 */
const LARGURA = 320;
const ALTURA = 140;
const MARGEM_Y = 12;
// Os pontos das pontas têm raio 3: sem folga lateral, o primeiro e o
// último seriam cortados ao meio pela borda do viewBox.
const MARGEM_X = 4;

const formatarData = (data: Date) =>
  data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const formatarPeso = (kg: number) =>
  kg.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function GraficoPeso({
  medicoes,
  pesoMetaKg,
  horizonteInicial = 30,
  agora = new Date(),
  className,
}: {
  medicoes: readonly MedicaoPeso[];
  pesoMetaKg?: number;
  horizonteInicial?: HorizonteDias;
  /** Injetável para manter story e teste independentes do relógio. */
  agora?: Date;
  className?: string;
}) {
  const [horizonteDias, setHorizonteDias] =
    useState<HorizonteDias>(horizonteInicial);
  const plano = montarPlanoDePeso({
    medicoes,
    pesoMetaKg,
    horizonteDias,
    agora,
  });

  const seletor = (
    <SeletorSegmentado
      rotulo="Período do gráfico"
      name="horizonte-peso"
      valor={String(horizonteDias)}
      opcoes={HORIZONTES_DISPONIVEIS.map((dias) => ({
        valor: String(dias),
        rotulo: String(dias),
        descricao: `${dias} dias`,
      }))}
      aoMudar={(valor) => setHorizonteDias(Number(valor) as HorizonteDias)}
    />
  );

  if (!plano) {
    // Sem gráfico não há `figure` (não há figura) nem seletor: um
    // controle de período que não altera nada visto é um botão morto,
    // e oferecê-lo aqui esconderia a única ação útil, que é registrar
    // o primeiro peso.
    return (
      <Card className={cn("gap-3 px-5", className)}>
        <span className="text-label-lg text-on-surface-strong">Peso</span>
        <p className="text-body-sm leading-relaxed text-muted-foreground">
          Registre seu peso para acompanhar a evolução até a meta.
        </p>
      </Card>
    );
  }

  // Uma folga fixa evita que a linha encoste na borda quando a
  // amplitude é grande, e impede a divisão por zero quando peso e meta
  // coincidem — caso em que o gráfico vira uma faixa de 2 kg.
  const amplitude = plano.maxKg - plano.minKg;
  const folga = amplitude === 0 ? 1 : amplitude * 0.1;
  const pisoKg = plano.minKg - folga;
  const tetoKg = plano.maxKg + folga;
  const janela = plano.fim.getTime() - plano.inicio.getTime() || 1;

  const projetar = ({ data, pesoKg }: MedicaoPeso) => ({
    x:
      MARGEM_X +
      ((data.getTime() - plano.inicio.getTime()) / janela) *
        (LARGURA - MARGEM_X * 2),
    y:
      MARGEM_Y +
      (1 - (pesoKg - pisoKg) / (tetoKg - pisoKg)) * (ALTURA - MARGEM_Y * 2),
  });

  const pontos = plano.medicoes.map((medicao) => ({
    ...medicao,
    ...projetar(medicao),
  }));
  const atual = plano.medicoes[plano.medicoes.length - 1];
  const linhaMeta = plano.linhaMeta?.map(projetar) ?? null;

  const resumo = [
    `Peso em quilogramas de ${formatarData(plano.inicio)} a ${formatarData(plano.fim)}.`,
    `Peso inicial ${formatarPeso(plano.medicoes[0].pesoKg)} kg, atual ${formatarPeso(atual.pesoKg)} kg, em ${plano.medicoes.length} ${plano.medicoes.length === 1 ? "registro" : "registros"}.`,
    pesoMetaKg === undefined
      ? "Sem meta registrada."
      : `Meta ${formatarPeso(pesoMetaKg)} kg em 120 dias.`,
  ].join(" ");

  return (
    <Card className={cn("px-5", className)}>
    <figure className="flex flex-col gap-3">
      <Cabecalho seletor={seletor} valor={atual.pesoKg} />

      {/* Sem `preserveAspectRatio="none"`: esticar o viewBox achataria
          os pontos das medições em elipses. O gráfico escala
          uniformemente e os pontos permanecem circulares. */}
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        role="img"
        aria-label={resumo}
        className="h-36 w-full"
      >
        {[MARGEM_Y, ALTURA / 2, ALTURA - MARGEM_Y].map((y) => (
          <line
            key={y}
            x1="0"
            x2={LARGURA}
            y1={y}
            y2={y}
            className="stroke-border"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

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

      <figcaption className="flex items-baseline justify-between gap-3 text-caption tabular-nums text-muted-foreground">
        <span>{formatarData(plano.inicio)}</span>
        <span>
          {formatarPeso(plano.minKg)}–{formatarPeso(plano.maxKg)} kg
        </span>
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

function Cabecalho({
  seletor,
  valor,
}: {
  seletor: React.ReactNode;
  valor: number;
}) {
  return (
    <div className="flex flex-col gap-3">
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
      {seletor}
    </div>
  );
}
