import { cn } from "@/lib/utils";

/**
 * Chip de seleção múltipla com formato `rounded.pill`, compartilhado
 * por chips, controles segmentados e avatares.
 *
 * Usa um `input` nativo transparente em vez do `Checkbox` do shadcn
 * porque o alvo clicável aqui é o chip inteiro — o estado é comunicado
 * pela superfície e pela borda, não por uma caixa ao lado do texto — e
 * porque o controle nativo envia o valor no `FormData` de uma Server
 * Action sem precisar de estado de cliente. O input cobre o chip inteiro
 * para preservar o alvo de toque e permanecer dentro do seu scroll
 * container; `sr-only` com `position: absolute` deixava o input fora
 * desse containing block e criava uma segunda rolagem no documento.
 *
 * O alvo mantém 44px de altura mínima, e `focus-visible` fica no chip
 * via `:has`, já que o input é transparente.
 */
export function ChipSelecao({
  id,
  name,
  value,
  rotulo,
  defaultChecked,
  className,
}: {
  id: string;
  name: string;
  value: string;
  rotulo: string;
  defaultChecked?: boolean;
  className?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "relative inline-flex min-h-11 cursor-pointer items-center rounded-pill border border-border bg-surface-container px-4 text-label-md text-muted-foreground transition-colors",
        "has-[input:checked]:border-border-strong has-[input:checked]:bg-surface-container-high has-[input:checked]:text-on-surface-strong",
        "has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="absolute inset-0 size-full opacity-0"
      />
      {rotulo}
    </label>
  );
}
