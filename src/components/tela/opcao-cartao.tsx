import type { LucideIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroupItem } from "@/components/ui/radio-group";

/**
 * Cartão de opção padrão da cascata: alto, com borda espessa que
 * reforça na seleção, ícone opcional à esquerda e controle circular
 * grande à direita.
 */
const BASE_CARTAO =
  "flex min-h-20 cursor-pointer items-center gap-4 rounded-xl border-2 border-border-strong bg-surface px-4 py-4 transition-colors hover:bg-surface-container has-data-checked:border-on-surface-strong";

const CONTROLE =
  "size-7 border-4 border-border-strong data-checked:border-on-surface-strong data-checked:bg-on-surface-strong";

function Conteudo({
  titulo,
  descricao,
  Icone,
}: {
  titulo: string;
  descricao?: string;
  Icone?: LucideIcon;
}) {
  return (
    <>
      {Icone ? (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-on-surface-strong text-background">
          <Icone className="size-6" aria-hidden="true" />
        </span>
      ) : null}
      <span className="flex flex-1 flex-col gap-1">
        <span className="text-title text-on-surface-strong">{titulo}</span>
        {descricao ? (
          <span className="text-body-sm font-normal text-muted-foreground">
            {descricao}
          </span>
        ) : null}
      </span>
    </>
  );
}

export function CartaoRadio({
  id,
  value,
  titulo,
  descricao,
  Icone,
}: {
  id: string;
  value: string;
  titulo: string;
  descricao?: string;
  Icone?: LucideIcon;
}) {
  return (
    <Label htmlFor={id} className={BASE_CARTAO}>
      <Conteudo titulo={titulo} descricao={descricao} Icone={Icone} />
      <RadioGroupItem id={id} value={value} className={CONTROLE} />
    </Label>
  );
}

/**
 * Aceita tanto o modo não-controlado (`defaultChecked`, usado pelas
 * etapas que apenas coletam) quanto o controlado (`checked` +
 * `onCheckedChange`), necessário onde a seleção é derivada de outra
 * resposta — como o catálogo de equipamentos, pré-marcado pelo local
 * de treino.
 */
export function CartaoCheckbox({
  id,
  name,
  value,
  titulo,
  descricao,
  Icone,
  defaultChecked,
  checked,
  onCheckedChange,
}: {
  id: string;
  name: string;
  value: string;
  titulo: string;
  descricao?: string;
  Icone?: LucideIcon;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (marcado: boolean) => void;
}) {
  return (
    <Label htmlFor={id} className={BASE_CARTAO}>
      <Conteudo titulo={titulo} descricao={descricao} Icone={Icone} />
      <Checkbox
        id={id}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        onCheckedChange={
          onCheckedChange
            ? (estado) => onCheckedChange(estado === true)
            : undefined
        }
        className={`${CONTROLE} rounded-full [&>*>svg]:size-4`}
      />
    </Label>
  );
}
