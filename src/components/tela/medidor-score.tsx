import { cn } from "@/lib/utils";

/**
 * Dimensão pontuada de 0 a 100: rótulo, valor tabular e trilho.
 *
 * Substitui o `<progress>` nativo, que o navegador desenha com a cor
 * e a altura do sistema operacional — em uma interface dark-first,
 * aparece como uma barra azul clara de 16px que não pertence a
 * nenhuma superfície do produto.
 *
 * A cor do trilho **não** classifica o resultado. Pintar de vermelho
 * um score baixo violaria a neutralidade comportamental de DESIGN.md
 * > Principles ("feedback informa sem culpa, dramatização ou
 * linguagem punitiva"): o número já comunica, a cor só adicionaria
 * julgamento. O preenchimento usa `on-surface-strong` — a mesma
 * ênfase de qualquer métrica do produto.
 *
 * O par rótulo+valor é lido como uma unidade por leitor de tela via
 * `aria-label` no trilho, para que o número não chegue solto.
 */
export function MedidorScore({
  rotulo,
  valor,
  maximo = 100,
  className,
}: {
  rotulo: string;
  valor: number;
  maximo?: number;
  className?: string;
}) {
  const proporcao = Math.max(0, Math.min(1, valor / maximo));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-label-lg text-on-surface-strong">{rotulo}</span>
        <span className="text-body-sm tabular-nums text-muted-foreground">
          {valor}
          <span aria-hidden="true">/{maximo}</span>
        </span>
      </div>
      <div
        role="img"
        aria-label={`${rotulo}: ${valor} de ${maximo}`}
        className="h-1.5 overflow-hidden rounded-pill bg-surface-container-high"
      >
        <div
          className="h-full rounded-pill bg-on-surface-strong"
          style={{ width: `${proporcao * 100}%` }}
        />
      </div>
    </div>
  );
}
