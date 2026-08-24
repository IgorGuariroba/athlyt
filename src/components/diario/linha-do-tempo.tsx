import { cn } from "@/lib/utils";

/**
 * Trilho cronológico do Diário: a hora à esquerda, ligada por uma
 * linha contínua, e o cartão do evento à direita.
 *
 * A largura fixa da coluna de hora é o que faz os cartões alinharem
 * entre si — com largura automática, `07:29` e `11:00` produziam duas
 * margens diferentes e a linha do tempo aparecia torta. O trilho é
 * decorativo; a ordem é comunicada pela lista ordenada e pela hora em
 * texto, nunca só pelo desenho.
 */
export function LinhaDoTempoDiario({
  itens,
  rotulo = "Linha do tempo do dia",
  className,
}: {
  itens: readonly { id: string; horaLocal: string; conteudo: React.ReactNode }[];
  rotulo?: string;
  className?: string;
}) {
  return (
    <ol aria-label={rotulo} className={cn("flex flex-col", className)}>
      {itens.map((item) => (
        <li key={item.id} className="flex gap-3">
          <div className="flex w-12 shrink-0 flex-col items-center pt-4">
            <span className="text-caption tabular-nums text-muted-foreground">
              {item.horaLocal}
            </span>
            <span aria-hidden="true" className="mt-1 w-px flex-1 bg-border" />
          </div>
          <div className="min-w-0 flex-1 py-2">{item.conteudo}</div>
        </li>
      ))}
    </ol>
  );
}
