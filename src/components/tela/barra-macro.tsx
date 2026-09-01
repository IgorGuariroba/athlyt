import { cn } from "@/lib/utils";

/**
 * Paleta semântica de nutrientes: o mesmo nutriente tem a mesma cor em
 * qualquer tela do produto — Início, Diário, revisão do plano.
 *
 * Fica aqui, e não em cada página, porque "cor com significado" só é
 * verdade se houver uma única definição. Enquanto cada tela declarava
 * o seu hex, três telas usavam `#f18562` para proteína e o token
 * `--nutrition-protein` valia `#f58a5b`: uma divergência invisível em
 * revisão de código e óbvia lado a lado no aparelho.
 *
 * Fibras usam `data-violet`, reservado a tendência secundária, por ser
 * a única série cromática livre.
 */
export const CORES_MACRO = {
  calorias: "bg-nutrition-calories",
  proteina: "bg-nutrition-protein",
  carboidratos: "bg-nutrition-carbs",
  gorduras: "bg-nutrition-fat",
  fibras: "bg-data-violet",
} as const;

export type Macro = keyof typeof CORES_MACRO;

/** Energia por grama, para converter gramas em participação calórica. */
export const MACROS = {
  proteina: { rotulo: "Proteína", cor: CORES_MACRO.proteina, kcalPorG: 4 },
  carboidratos: {
    rotulo: "Carboidratos",
    cor: CORES_MACRO.carboidratos,
    kcalPorG: 4,
  },
  gorduras: { rotulo: "Gorduras", cor: CORES_MACRO.gorduras, kcalPorG: 9 },
} as const;

export type MacroEnergetico = keyof typeof MACROS;

/**
 * Barra de participação de um macro na energia do dia.
 *
 * A largura mínima de 4% é deliberada: uma barra de largura zero
 * comunicaria "sem meta" quando o valor é apenas pequeno. A leitura
 * quantitativa fica no número em gramas ao lado, nunca só na barra ou
 * na cor.
 */
export function BarraMacro({
  macro,
  gramas,
  caloriasTotais,
  className,
}: {
  macro: MacroEnergetico;
  gramas: number;
  caloriasTotais: number;
  className?: string;
}) {
  const { rotulo, cor, kcalPorG } = MACROS[macro];
  const percentual =
    caloriasTotais > 0
      ? Math.min(
          100,
          Math.max(4, Math.round(((gramas * kcalPorG) / caloriasTotais) * 100)),
        )
      : 0;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-body-md font-semibold text-on-surface">
          {rotulo}
        </span>
        <span className="text-body-md tabular-nums text-muted-foreground">
          {gramas} g · {percentual}% da energia
        </span>
      </div>
      <div
        role="img"
        aria-label={`${rotulo}: ${gramas} gramas, ${percentual}% da energia diária`}
        className="h-3 overflow-hidden rounded-full bg-surface-container-high"
      >
        <div
          className={cn("h-full rounded-full", cor)}
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}
