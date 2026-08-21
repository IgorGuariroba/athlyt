import Image from "next/image";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/**
 * Opção horizontal com miniatura para catálogos visuais.
 *
 * Mantém imagem, rótulo e seleção como um único alvo de toque. O slot
 * `acao` acomoda uma ação secundária, como excluir um item personalizado,
 * sem acoplar o componente ao domínio que originou o catálogo.
 */
export function CartaoSelecaoImagem({
  id,
  name,
  value,
  rotulo,
  src,
  checked,
  defaultChecked,
  onCheckedChange,
  acao,
  loading = "lazy",
}: {
  id: string;
  name: string;
  value: string;
  rotulo: string;
  src: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (marcado: boolean) => void;
  acao?: React.ReactNode;
  loading?: "eager" | "lazy";
}) {
  return (
    <Label
      htmlFor={id}
      className="flex min-h-24 cursor-pointer items-center gap-4 rounded-xl border-2 border-border-strong bg-surface px-3 py-3 transition-colors hover:bg-surface-container has-data-checked:border-on-surface-strong"
    >
      <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1">
        <Image
          src={src}
          alt=""
          width={160}
          height={112}
          loading={loading}
          className="h-full w-full object-contain"
        />
      </span>
      <span className="flex-1 text-title text-on-surface-strong">{rotulo}</span>
      {acao}
      <Checkbox
        id={id}
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={
          onCheckedChange
            ? (estado) => onCheckedChange(estado === true)
            : undefined
        }
        aria-label={rotulo}
        className="size-7 shrink-0 rounded-full border-4 border-border-strong data-checked:border-on-surface-strong data-checked:bg-on-surface-strong [&>*>svg]:size-4"
      />
    </Label>
  );
}
