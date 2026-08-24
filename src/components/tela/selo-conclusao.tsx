import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Cabeçalho celebratório do fim de um ciclo — hoje, o fim de uma
 * Sessão de Treino.
 *
 * É a única marca celebratória do produto, e por isso existe como
 * componente e não como markup de uma tela: DESIGN.md > Typography
 * autoriza a escala de destaque apenas para "resultados excepcionais",
 * e essa autorização precisa morar em um lugar só. Montada à mão na
 * página, a regra vira classe solta e a próxima tela de conclusão
 * inventa outro selo.
 *
 * O `tom` distingue o desfecho sem depender do texto: `sucesso` para o
 * ciclo que fechou como planejado, `atencao` para o que foi encerrado
 * antes. A cor é reforço — o contexto e o título dizem a mesma coisa
 * em palavras (DESIGN.md > Accessibility: "nunca comunique estado só
 * por cor").
 */
export function SeloConclusao({
  Icone,
  tom = "sucesso",
  contexto,
  titulo,
  descricao,
  className,
}: {
  Icone: LucideIcon;
  tom?: "sucesso" | "atencao";
  /** Rótulo curto acima do título — é eyebrow, não cabeçalho. */
  contexto: string;
  titulo: string;
  /** Nota de desfecho: motivo do encerramento, ressalva, contexto. */
  descricao?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col items-center gap-2 px-6 pt-10 pb-6 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "mb-3 flex size-20 items-center justify-center rounded-full",
          tom === "sucesso"
            ? "bg-success/15 text-success"
            : "bg-warning/15 text-warning",
        )}
      >
        <Icone aria-hidden="true" className="size-10" />
      </div>
      <p className="text-label-md font-semibold tracking-wide text-muted-foreground uppercase">
        {contexto}
      </p>
      <h1 className="font-brand text-headline-lg font-bold text-on-surface-strong">
        {titulo}
      </h1>
      {descricao ? (
        <p className="text-body-md text-muted-foreground">{descricao}</p>
      ) : null}
    </header>
  );
}
