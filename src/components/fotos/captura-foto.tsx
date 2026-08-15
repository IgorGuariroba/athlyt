"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Camera, Images, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Captura de uma foto avulsa, com prévia — o passo "aponte e
 * fotografe" antes de qualquer formulário.
 *
 * Dois seletores e não um: `capture="environment"` abre a câmera
 * traseira direto, e é o caminho de quem está diante do prato; sem
 * `capture`, o mesmo controle abre a galeria, que é o caminho de quem
 * fotografou antes e registra depois. Um único input obrigaria o
 * sistema operacional a perguntar, somando um toque ao gesto que este
 * componente existe para encurtar.
 *
 * A prévia é um `objectURL` derivado do arquivo escolhido e revogado
 * assim que ele deixa de valer.
 *
 * O componente não envia nada: ele entrega o `File` escolhido e
 * quem o usa decide o destino.
 */
export function CapturaFoto({
  arquivo,
  aoEscolher,
  rotuloCaptura = "Tirar foto",
  rotuloGaleria = "Escolher da galeria",
  dica,
  className,
}: {
  arquivo: File | null;
  aoEscolher: (arquivo: File | null) => void;
  rotuloCaptura?: string;
  rotuloGaleria?: string;
  dica?: string;
  className?: string;
}) {
  const idCaptura = useId();
  const idGaleria = useId();
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  // A prévia é derivada do arquivo durante a renderização, e não num
  // efeito: o arquivo é propriedade controlada pelo pai, e sincronizar
  // por efeito significaria uma renderização extra exibindo a foto
  // anterior — visível como um piscar a cada troca. Guardar o par
  // (arquivo, url) é o que permite reconhecer a troca sem efeito.
  const [previa, setPrevia] = useState<{ de: File | null; url: string | null }>({
    de: null,
    url: null,
  });
  if (previa.de !== arquivo) {
    setPrevia({ de: arquivo, url: arquivo ? URL.createObjectURL(arquivo) : null });
  }

  // A revogação é o único efeito colateral aqui, e vive no efeito: sem
  // ela, cada nova tentativa vazaria um blob na memória da aba — numa
  // tela de registro repetido, a diferença entre usar por um minuto e
  // usar todo dia.
  useEffect(() => {
    const url = previa.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [previa.url]);

  function limpar() {
    aoEscolher(null);
    if (camera.current) camera.current.value = "";
    if (galeria.current) galeria.current.value = "";
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* ui-excecao: seletor de arquivo/câmera é justamente o controle
          que este componente do catálogo encapsula para as telas. */}
      <input
        ref={camera}
        id={idCaptura}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={(evento) => aoEscolher(evento.target.files?.[0] ?? null)}
      />
      {/* ui-excecao: idem — mesmo controle, sem `capture`, para a galeria. */}
      <input
        ref={galeria}
        id={idGaleria}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(evento) => aoEscolher(evento.target.files?.[0] ?? null)}
      />

      {previa.url ? (
        <figure className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob local, sem otimização possível */}
          <img
            src={previa.url}
            alt="Prévia da foto escolhida"
            className="aspect-[4/3] w-full rounded-xl border border-border object-cover"
          />
          <figcaption className="flex items-center justify-between gap-3">
            <span className="text-body-sm text-muted-foreground">
              {arquivo?.name}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={limpar}>
              <RotateCcw className="size-4" aria-hidden="true" /> Trocar foto
            </Button>
          </figcaption>
        </figure>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="cta"
            className="w-full"
            onClick={() => camera.current?.click()}
          >
            <Camera className="size-5" aria-hidden="true" /> {rotuloCaptura}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => galeria.current?.click()}
          >
            <Images className="size-4" aria-hidden="true" /> {rotuloGaleria}
          </Button>
          {dica ? (
            <p className="text-body-sm leading-relaxed text-muted-foreground">
              {dica}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
