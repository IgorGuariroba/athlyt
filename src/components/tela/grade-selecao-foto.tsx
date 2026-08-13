import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Grade de fotos selecionáveis por toque na imagem inteira.
 *
 * A seleção é comunicada pela borda e por uma marca no canto — não por
 * uma caixa de seleção ao lado da legenda. Numa grade de miniaturas, a
 * caixa separada obriga a mirar um alvo de 16px ao lado do conteúdo
 * que se quer escolher, e o estado fica visualmente desconectado da
 * foto que ele descreve.
 *
 * Usa `input[type=checkbox]` nativo escondido (mesma decisão de
 * `ChipSelecao`): o valor entra no `FormData` de uma Server Action sem
 * estado de cliente, e `has-[input:checked]` cuida do estilo.
 */
export function GradeSelecaoFoto({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>{children}</div>
  );
}

export function ItemSelecaoFoto({
  id,
  name,
  value,
  src,
  alt,
  rotulo,
  meta,
  defaultChecked,
}: {
  id: string;
  name: string;
  value: string;
  src: string;
  alt: string;
  rotulo: string;
  meta?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "group relative flex cursor-pointer flex-col gap-2 overflow-hidden rounded-lg border-2 border-border bg-surface-container p-1 transition-colors",
        "has-[input:checked]:border-on-surface-strong",
        "has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50",
      )}
    >
      <input
        id={id}
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      <Image
        unoptimized
        src={src}
        alt={alt}
        width={300}
        height={420}
        className="aspect-[2/3] w-full rounded-md object-cover"
      />
      {/* O indicador só aparece quando marcado: numa grade densa, um
          círculo vazio em cada item competiria com as próprias fotos. */}
      <span
        aria-hidden="true"
        className="absolute top-3 right-3 hidden size-5 items-center justify-center rounded-full bg-on-surface-strong text-caption font-bold text-background group-has-[input:checked]:flex"
      >
        ✓
      </span>
      <span className="px-1 pb-1">
        <span className="block text-label-md text-on-surface-strong">
          {rotulo}
        </span>
        {meta ? (
          <span className="block text-caption text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </span>
    </label>
  );
}
