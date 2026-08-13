import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Ausência de dados, dita de forma completa: ícone, causa e — quando
 * existe — a ação que preenche o vazio.
 *
 * O produto vinha resolvendo isso com um cartão contendo uma frase
 * `muted` ("Suas sessões concluídas aparecerão aqui."). Numa tela
 * inteira vazia, esse cartão fica ambíguo: não se distingue de conteúdo
 * ainda carregando, e não diz o que fazer a seguir. DESIGN.md >
 * Principles pede "neutralidade comportamental" — informar sem culpa —
 * mas informar inclui apontar a próxima ação.
 *
 * O ícone é decorativo (`aria-hidden`): quem usa leitor de tela recebe
 * o título e a explicação, que carregam o significado inteiro.
 *
 * `centralizado` distingue os dois casos de uso: uma tela inteiramente
 * vazia centraliza no eixo vertical disponível; uma seção vazia dentro
 * de uma tela com conteúdo permanece no fluxo, sem esticar.
 */
export function EstadoVazio({
  Icone,
  titulo,
  descricao,
  acao,
  centralizado = false,
  className,
}: {
  Icone?: LucideIcon;
  titulo: string;
  descricao?: string;
  /** Botão ou link que resolve o vazio. Omita quando não houver ação. */
  acao?: React.ReactNode;
  centralizado?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-border bg-surface-container px-6 py-10 text-center",
        centralizado && "flex-1 justify-center",
        className,
      )}
    >
      {Icone ? (
        <Icone aria-hidden="true" className="size-6 text-muted-foreground" />
      ) : null}
      <p className="text-title font-bold text-on-surface-strong">{titulo}</p>
      {descricao ? (
        <p className="max-w-xs text-body-sm leading-relaxed text-muted-foreground">
          {descricao}
        </p>
      ) : null}
      {acao ? <div className="pt-1">{acao}</div> : null}
    </div>
  );
}
