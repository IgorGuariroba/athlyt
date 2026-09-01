import { cn } from "@/lib/utils";

/**
 * Posição de uma medida dentro da sua faixa de referência, com o alvo
 * do ciclo marcado no mesmo eixo.
 *
 * Uma meta de proporção responde a três perguntas distintas — onde
 * estou, aonde vou neste ciclo, qual é a faixa ideal de longo prazo —
 * e por isso deve ser estruturada por comparação. Mas régua
 * sem legenda não comunica: a versão anterior desenhava três
 * marcadores sem nomear nenhum, e os únicos números rotulados eram os
 * extremos da faixa.
 *
 * Por isso cada valor aparece como par rótulo+número, e cada rótulo
 * carrega o mesmo marcador que o representa no eixo. É o que liga o
 * desenho ao dado sem depender de o usuário adivinhar a convenção.
 * Seleção, tendência ou erro não podem depender apenas de cor — aqui,
 * nem apenas de posição.
 *
 * A faixa ocupa 60% centrais do eixo para que valores fora dela ainda
 * apareçam dentro do desenho: uma medida acima do limite superior
 * precisa ser visível como "acima", não recortada na borda.
 */
const FAIXA_INICIO = 20;
const FAIXA_FIM = 80;

function posicao(valor: number, min: number, max: number): number {
  const amplitude = max - min || 1;
  const relativo = (valor - min) / amplitude;
  return Math.min(
    98,
    Math.max(2, FAIXA_INICIO + relativo * (FAIXA_FIM - FAIXA_INICIO)),
  );
}

const formatar = (valor: number) =>
  valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** Item da legenda: marcador idêntico ao do eixo, rótulo e valor. */
function ValorLegenda({
  marcador,
  rotulo,
  valor,
  unidade,
  forte,
}: {
  marcador: React.ReactNode;
  rotulo: string;
  valor: string;
  unidade: string;
  forte?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
        {marcador}
        {rotulo}
      </span>
      <span
        className={cn(
          "truncate tabular-nums",
          forte
            ? "text-label-lg text-on-surface-strong"
            : "text-label-lg font-normal text-on-surface",
        )}
      >
        {valor}{" "}
        <span className="text-caption font-normal text-muted-foreground">
          {unidade}
        </span>
      </span>
    </div>
  );
}

export function BarraFaixa({
  rotuloAcessivel,
  atual,
  min,
  max,
  meta,
  unidade,
  className,
}: {
  /** Descrição textual completa para leitores de tela. */
  rotuloAcessivel: string;
  atual: number;
  min: number;
  max: number;
  meta: number;
  unidade: string;
  className?: string;
}) {
  const posicaoAtual = posicao(atual, min, max);
  const posicaoMeta = posicao(meta, min, max);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div role="img" aria-label={rotuloAcessivel} className="flex flex-col gap-1.5">
        <div className="relative h-2 rounded-pill bg-surface-container-high">
          <span
            className="absolute inset-y-0 rounded-pill bg-border-strong"
            style={{ left: `${FAIXA_INICIO}%`, right: `${100 - FAIXA_FIM}%` }}
          />
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-muted-foreground"
            style={{ left: `${posicaoMeta}%` }}
          />
          <span
            aria-hidden="true"
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-on-surface-strong"
            style={{ left: `${posicaoAtual}%` }}
          />
        </div>
        {/* Extremos da faixa ancoram a escala do eixo; o significado
            deles vive na legenda "Faixa ideal", abaixo. */}
        <div className="flex justify-between text-caption tabular-nums text-muted-foreground">
          <span>{formatar(min)}</span>
          <span>{formatar(max)}</span>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3 border-t border-border pt-3">
        <div className="contents">
          <dt className="sr-only">Medida atual</dt>
          <dd>
            <ValorLegenda
              forte
              marcador={
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full bg-on-surface-strong"
                />
              }
              rotulo="Atual"
              valor={formatar(atual)}
              unidade={unidade}
            />
          </dd>
        </div>
        <div className="contents">
          <dt className="sr-only">Meta deste ciclo</dt>
          <dd>
            <ValorLegenda
              marcador={
                <span
                  aria-hidden="true"
                  className="h-2.5 w-0.5 shrink-0 rounded-pill bg-muted-foreground"
                />
              }
              rotulo="Meta do ciclo"
              valor={formatar(meta)}
              unidade={unidade}
            />
          </dd>
        </div>
        <div className="contents">
          <dt className="sr-only">Faixa ideal de longo prazo</dt>
          <dd>
            <ValorLegenda
              marcador={
                <span
                  aria-hidden="true"
                  className="h-1.5 w-3 shrink-0 rounded-pill bg-border-strong"
                />
              }
              rotulo="Faixa ideal"
              valor={`${formatar(min)}–${formatar(max)}`}
              unidade={unidade}
            />
          </dd>
        </div>
      </dl>
    </div>
  );
}
