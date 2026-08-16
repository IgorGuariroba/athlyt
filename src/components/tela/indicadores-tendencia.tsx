import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

type PontoTendencia = { data: Date; valor: number };

type DeltaTendencia = {
  absoluto: number;
  porDia: number;
  dias: number;
  direcao: "alta" | "queda" | "estavel";
};

const formatar = (valor: number, casas = 1) =>
  valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

const formatarData = (data: Date) =>
  data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

/**
 * Média móvel exponencial usada para separar tendência de oscilação diária.
 *
 * O componente expõe o cálculo porque o resumo textual e a sparkline precisam
 * usar exatamente a mesma leitura. Uma página não deve afirmar "queda" quando
 * o desenho está mostrando outra suavização.
 */
export function suavizarTendencia(
  serie: readonly PontoTendencia[],
  alfa = 0.25,
): PontoTendencia[] {
  let acumulado: number | null = null;
  return [...serie]
    .sort((a, b) => a.data.getTime() - b.data.getTime())
    .map((ponto) => {
      acumulado =
        acumulado === null
          ? ponto.valor
          : acumulado + alfa * (ponto.valor - acumulado);
      return { data: ponto.data, valor: acumulado };
    });
}

/** Variação suavizada entre as pontas da janela. */
export function calcularDeltaTendencia(
  serie: readonly PontoTendencia[],
): DeltaTendencia | null {
  if (serie.length < 2) return null;
  const suave = suavizarTendencia(serie);
  const primeiro = suave[0];
  const ultimo = suave[suave.length - 1];
  const absoluto = ultimo.valor - primeiro.valor;
  const dias = Math.max(
    1,
    Math.round(
      (ultimo.data.getTime() - primeiro.data.getTime()) / 86_400_000,
    ),
  );
  return {
    absoluto,
    porDia: absoluto / dias,
    dias,
    direcao:
      Math.abs(absoluto) < 0.05 ? "estavel" : absoluto > 0 ? "alta" : "queda",
  };
}

/**
 * Sparkline compacta para leitura periférica de uma série.
 *
 * Diferente de `GraficoTendencia`, ela deliberadamente não possui eixos nem
 * valores: serve como apoio a uma métrica que já está escrita ao lado. O
 * desenho é decorativo e o contexto acessível permanece no rótulo e no delta.
 */
export function SparklineTendencia({
  serie,
  cor = "text-on-surface-strong",
  className,
}: {
  serie: readonly PontoTendencia[];
  /** Token de cor da paleta de dados. */
  cor?: string;
  className?: string;
}) {
  if (serie.length < 2) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "h-10 rounded-md bg-surface-container-high/60",
          className,
        )}
      />
    );
  }

  const largura = 100;
  const altura = 32;
  const suave = suavizarTendencia(serie);
  const valores = suave.map((ponto) => ponto.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const amplitude = max - min || 1;
  const linha = suave
    .map((ponto, indice) => {
      const x = (indice / (suave.length - 1)) * largura;
      const y = 3 + (1 - (ponto.valor - min) / amplitude) * (altura - 6);
      return `${x},${y}`;
    })
    .join(" ");
  const ultimo = suave[suave.length - 1];
  const fimX = largura;
  const fimY = 3 + (1 - (ultimo.valor - min) / amplitude) * (altura - 6);

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("h-8 w-full", cor, className)}
    >
      <polyline
        points={linha}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={fimX}
        cy={fimY}
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Delta neutro com direção, magnitude e janela temporal explícitas.
 *
 * Peso e medidas corporais não recebem julgamento cromático: alta e queda
 * podem ser desejáveis ou indesejáveis dependendo do plano. O ícone e o texto
 * comunicam a direção sem depender de cor.
 */
export function SeloVariacao({
  delta,
  unidade,
  porSemana = false,
  className,
}: {
  delta: DeltaTendencia | null;
  unidade: string;
  porSemana?: boolean;
  className?: string;
}) {
  if (!delta) {
    return (
      <span className={cn("text-caption text-muted-foreground", className)}>
        Sem comparação
      </span>
    );
  }

  const Icone =
    delta.direcao === "alta"
      ? ArrowUpRight
      : delta.direcao === "queda"
        ? ArrowDownRight
        : Minus;
  const valor = porSemana ? delta.porDia * 7 : delta.absoluto;
  const sinal = valor > 0 ? "+" : valor < 0 ? "−" : "";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill bg-surface-container-high px-2 py-1 text-caption tabular-nums text-on-surface",
        className,
      )}
    >
      <Icone aria-hidden="true" className="size-3 shrink-0" />
      {sinal}
      {formatar(Math.abs(valor))} {unidade}
      <span className="text-muted-foreground">
        {porSemana ? "/sem" : ` em ${delta.dias}d`}
      </span>
    </span>
  );
}

type EventoProgresso = {
  data: Date;
  titulo: string;
  detalhe?: string;
  acao?: { rotulo: string; href: string };
};

/**
 * Linha do tempo compacta para registros corporais heterogêneos.
 *
 * Data, marcador e conteúdo formam uma única linha sem transformar cada
 * evento em cartão. A ordenação pertence ao chamador, que pode usar ordem
 * recente-primeiro para histórico ou cronológica para uma narrativa.
 */
export function LinhaTempoProgresso({
  eventos,
}: {
  eventos: readonly EventoProgresso[];
}) {
  return (
    <ol className="flex flex-col">
      {eventos.map((evento, indice) => (
        <li key={`${evento.data.getTime()}-${evento.titulo}`} className="flex gap-3">
          <div className="flex w-14 shrink-0 justify-end pt-3">
            <span className="text-caption tabular-nums text-muted-foreground">
              {formatarData(evento.data)}
            </span>
          </div>
          <div className="flex flex-col items-center" aria-hidden="true">
            <span
              className={cn(
                "w-px flex-1 bg-border",
                indice === 0 && "opacity-0",
              )}
            />
            <span className="my-1 size-2 shrink-0 rounded-full bg-border-strong" />
            <span
              className={cn(
                "w-px flex-1 bg-border",
                indice === eventos.length - 1 && "opacity-0",
              )}
            />
          </div>
          <div className="min-w-0 flex-1 py-3">
            <strong className="text-label-lg text-on-surface-strong">
              {evento.titulo}
            </strong>
            {evento.detalhe ? (
              <p className="text-body-sm leading-relaxed text-muted-foreground">
                {evento.detalhe}
              </p>
            ) : null}
            {evento.acao ? (
              <Link
                href={evento.acao.href}
                className="mt-1 inline-flex items-center gap-1 text-label-md text-on-surface-strong underline underline-offset-4"
              >
                {evento.acao.rotulo}
                <ArrowRight aria-hidden="true" className="size-3" />
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
