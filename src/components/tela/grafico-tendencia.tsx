import { cn } from "@/lib/utils";

/**
 * Cartão de gráfico do sistema: header com título e valor mais recente,
 * plot com linhas de grade
 * discretas, eixos em `caption` e estados de dados/sem dados
 * explícitos.
 *
 * Quatro decisões ficam aqui, e não na página:
 *
 * 1. **Contexto temporal e unidade nunca somem** ("não truncar unidade
 *    nem remover contexto temporal"): as datas das pontas e a faixa de
 *    valores são parte do componente, não um extra da tela.
 * 2. **A série é mais saturada que os eixos.** A cor entra por token da
 *    paleta de dados; a grade usa `border` com baixa ênfase.
 * 3. **A leitura não depende do desenho.** Gráficos precisam de resumo
 *    textual ou tabela acessível, fornecidos aqui pelo `aria-label`.
 * 4. **Séries comparáveis dividem o mesmo eixo.** Direito e esquerdo
 *    de uma medida bilateral existem para serem comparados: em dois
 *    gráficos com escalas próprias, uma assimetria de 5 mm parece
 *    idêntica a uma de 5 cm.
 */
export interface PontoSerie { data: Date; valor: number }

export interface Serie {
  /** Rótulo da série; obrigatório quando há mais de uma. */
  nome?: string;
  valores: readonly PontoSerie[];
  /** Classe de cor da série — use um token da paleta de dados. */
  cor?: string;
}

const LARGURA = 300;
const ALTURA = 100;
const MARGEM = 8;

const formatarData = (data: Date) =>
  data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const formatarValor = (valor: number) =>
  valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function GraficoTendencia({
  titulo,
  unidade,
  series,
  className,
}: {
  titulo: string;
  unidade: string;
  series: readonly Serie[];
  className?: string;
}) {
  const preparadas = series.map((serie) => ({
    ...serie,
    valores: [...serie.valores].sort(
      (a, b) => a.data.getTime() - b.data.getTime(),
    ),
  }));
  const pontos = preparadas.flatMap((serie) => serie.valores);
  const comTendencia = preparadas.filter((serie) => serie.valores.length > 1);

  if (comTendencia.length === 0) {
    return (
      <figure className={cn("flex flex-col gap-1", className)}>
        <figcaption className="text-label-lg text-on-surface-strong">
          {titulo}
        </figcaption>
        <p className="text-body-sm leading-relaxed text-muted-foreground">
          {pontos.length === 1
            ? `Um registro em ${formatarData(pontos[0].data)}. A tendência aparece a partir do segundo ponto comparável.`
            : "Sem registros no período selecionado."}
        </p>
      </figure>
    );
  }

  // Escala compartilhada: é o que torna as séries comparáveis entre si.
  const valores = pontos.map((ponto) => ponto.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const amplitude = max - min || 1;
  const inicio = Math.min(...pontos.map((ponto) => ponto.data.getTime()));
  const fim = Math.max(...pontos.map((ponto) => ponto.data.getTime()));
  const janela = fim - inicio || 1;

  const projetar = (ponto: PontoSerie) => ({
    x: ((ponto.data.getTime() - inicio) / janela) * LARGURA,
    y: MARGEM + (1 - (ponto.valor - min) / amplitude) * (ALTURA - MARGEM * 2),
  });

  const desenhadas = comTendencia.map((serie) => {
    const coordenadas = serie.valores.map(projetar);
    const linha = coordenadas.map(({ x, y }) => `${x},${y}`).join(" ");
    const ultimo = serie.valores[serie.valores.length - 1];
    const primeiro = serie.valores[0];
    const variacao = ultimo.valor - primeiro.valor;
    return {
      ...serie,
      linha,
      area:
        comTendencia.length === 1
          ? `${coordenadas[0].x},${ALTURA} ${linha} ${coordenadas[coordenadas.length - 1].x},${ALTURA}`
          : null,
      primeiro,
      ultimo,
      variacao,
    };
  });

  const resumo = `${titulo}, em ${unidade}, de ${formatarData(new Date(inicio))} a ${formatarData(new Date(fim))}. ${desenhadas
    .map(
      (serie) =>
        `${serie.nome ? `${serie.nome}: ` : ""}${formatarValor(serie.primeiro.valor)} para ${formatarValor(serie.ultimo.valor)}, ${
          serie.variacao === 0
            ? "sem variação"
            : `${serie.variacao > 0 ? "alta" : "queda"} de ${formatarValor(Math.abs(serie.variacao))}`
        }, em ${serie.valores.length} registros`,
    )
    .join(". ")}.`;

  const principal = desenhadas[0];

  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-label-lg text-on-surface-strong">
          {titulo}
        </span>
        {desenhadas.length === 1 ? (
          <span className="shrink-0 text-label-lg tabular-nums text-on-surface-strong">
            {formatarValor(principal.ultimo.valor)}{" "}
            <span className="text-body-sm font-normal text-muted-foreground">
              {unidade}
            </span>
          </span>
        ) : null}
      </div>

      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={resumo}
        className="h-24 w-full"
      >
        {[MARGEM, ALTURA / 2, ALTURA - MARGEM].map((y) => (
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
        {desenhadas.map((serie, indice) => (
          <g
            key={serie.nome ?? indice}
            className={serie.cor ?? "text-on-surface-strong"}
          >
            {serie.area ? (
              // Preenchimento translúcido sob a linha é o único recurso
              // de profundidade permitido em gráficos. Com duas séries
              // ele viraria ruído.
              <polygon points={serie.area} fill="currentColor" opacity="0.12" />
            ) : null}
            <polyline
              points={serie.linha}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              // A segunda série é tracejada: a distinção não pode
              // depender só de cor.
              strokeDasharray={indice > 0 ? "5 4" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>

      <figcaption className="flex items-baseline justify-between gap-3 text-caption tabular-nums text-muted-foreground">
        <span>{formatarData(new Date(inicio))}</span>
        <span>
          {formatarValor(min)}–{formatarValor(max)} {unidade}
        </span>
        <span>{formatarData(new Date(fim))}</span>
      </figcaption>

      {desenhadas.length > 1 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {desenhadas.map((serie, indice) => (
            <li
              key={serie.nome ?? indice}
              className="flex items-center gap-2 text-body-sm text-muted-foreground"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-0.5 w-4 shrink-0 rounded-pill bg-current",
                  serie.cor ?? "text-on-surface-strong",
                  indice > 0 && "opacity-60",
                )}
              />
              {serie.nome}
              <span className="tabular-nums text-on-surface">
                {formatarValor(serie.ultimo.valor)} {unidade}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
