import { cn } from "@/lib/utils";

/**
 * Moldura das telas de conteúdo rolável (as que não são etapa da
 * cascata): coluna única, largura limitada e centralizada, margem
 * lateral de 16–24px e espaço inferior reservado para a
 * `BarraAcaoFixa`, impedindo que o CTA fixo esconda conteúdo rolável.
 *
 * `comAcaoFixa` existe para que o padding inferior seja consequência
 * declarada da presença do CTA, e não um número mágico repetido em
 * cada tela.
 */
export function TelaConteudo({
  comAcaoFixa = false,
  className,
  children,
}: {
  comAcaoFixa?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-lg flex-1 flex-col bg-background",
        comAcaoFixa ? "pb-28" : "pb-8",
        className,
      )}
    >
      {children}
    </main>
  );
}

/**
 * Agrupa seções com o ritmo vertical do sistema (gap de seção: 24px)
 * dentro da margem lateral da tela.
 */
export function SecoesTela({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-6 px-6", className)}>{children}</div>
  );
}

/**
 * Texto auxiliar de rodapé — ressalvas, origem do cálculo, avisos de
 * escopo. Sempre `muted`, nunca informação crítica.
 */
export function NotaTela({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-6 pt-6 text-body-sm leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}
