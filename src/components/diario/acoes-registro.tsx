import Link from "next/link";
import { Camera, PencilLine, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Par de ações de registro do Diário: a câmera como caminho padrão e a
 * busca como caminho preciso.
 *
 * A hierarquia é a decisão que este componente guarda: fotografar
 * ocupa a largura e ganha a legenda que explica o que o agent faz;
 * registrar item a item fica num alvo quadrado ao lado. Enquanto isso
 * era JSX de página, o botão maior já apareceu como "Registrar
 * alimento" — e o caminho frequente virou o mais custoso.
 *
 * `hrefDescricao` entra numa segunda linha, e não disputando a
 * primeira: descrever é o caminho de quem **não está** diante do
 * prato (ADR 0002), e pô-lo lado a lado com a câmera faria os dois
 * parecerem alternativas do mesmo momento.
 */
export function AcoesRegistro({
  hrefFoto,
  hrefBusca,
  hrefDescricao,
  className,
}: {
  hrefFoto: string;
  hrefBusca: string;
  /** Registro Retroativo por texto ou áudio; omitido, a linha não aparece. */
  hrefDescricao?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex gap-2">
        <Button asChild size="lg" className="h-14 flex-1 flex-col gap-0.5">
          <Link href={hrefFoto}>
            <span className="flex items-center gap-2 text-label-lg">
              <Camera className="size-5" aria-hidden="true" /> Fotografar refeição
            </span>
            <span className="text-caption font-normal opacity-80">
              o agent estima calorias e macros
            </span>
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-14 w-14 shrink-0">
          <Link href={hrefBusca} aria-label="Registrar buscando alimento">
            <Plus className="size-5" aria-hidden="true" />
          </Link>
        </Button>
      </div>
      {hrefDescricao ? (
        <Button asChild variant="ghost" size="sm">
          <Link href={hrefDescricao}>
            <PencilLine className="size-4" aria-hidden="true" /> Comi antes e quero registrar
            agora
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
