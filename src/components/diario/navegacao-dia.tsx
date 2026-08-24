import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Navegação entre dias do Diário: título do dia ao centro, com as duas
 * setas nas bordas.
 *
 * Fica no catálogo porque o padrão "dia anterior / rótulo / próximo
 * dia" reaparece em qualquer tela ancorada em data (Diário, medições,
 * histórico de sessões) e, montado à mão, perde duas garantias:
 * o alvo de 44px das setas e o bloqueio do futuro. `hrefProximo`
 * ausente desabilita a seta em vez de escondê-la — a afordância
 * permanece no lugar, e o layout não salta ao virar o dia.
 */
export function NavegacaoDia({
  titulo,
  subtitulo,
  hrefAnterior,
  hrefProximo,
  className,
}: {
  titulo: string;
  subtitulo?: string;
  hrefAnterior: string;
  /** Omita para desabilitar o avanço (por exemplo, no dia de hoje). */
  hrefProximo?: string;
  className?: string;
}) {
  return (
    <header className={cn("flex items-center justify-between", className)}>
      <Button asChild variant="ghost" size="icon">
        <Link href={hrefAnterior} aria-label="Dia anterior">
          <ChevronLeft aria-hidden="true" />
        </Link>
      </Button>
      <div className="text-center">
        <h1 className="text-title-lg font-bold text-on-surface-strong">
          {titulo}
        </h1>
        {subtitulo ? (
          <p className="text-caption text-muted-foreground">{subtitulo}</p>
        ) : null}
      </div>
      {hrefProximo ? (
        <Button asChild variant="ghost" size="icon">
          <Link href={hrefProximo} aria-label="Próximo dia">
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <Button variant="ghost" size="icon" disabled aria-label="Próximo dia">
          <ChevronRight aria-hidden="true" />
        </Button>
      )}
    </header>
  );
}
