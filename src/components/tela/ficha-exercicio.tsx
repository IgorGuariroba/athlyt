"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Dumbbell, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GrupoMuscular } from "@/domain/plano/exercicios";
import { DiagramaMuscular } from "./diagrama-muscular";

/**
 * Ponto de entrada para a Mídia de Execução (CONTEXT.md): "Animação/
 * vídeo demonstrativo do exercício vindo de banco aberto/licenciado
 * [...], com fallback de instruções em texto e diagrama de
 * músculos-alvo."
 *
 * A animação real vem da ExerciseDB, espelhada no R2 e servida por
 * `/api/midia-execucao/{exercicioId}` (ver `midiaDoExercicio` em
 * `@/domain/plano/midia-execucao`). O componente não busca nada —
 * recebe `midiaUrl` de quem já sabe se há mídia mapeada, e continua
 * sem I/O próprio. `comoExecutar` é o fallback declarado: some
 * mapeamento, offline sem cache ou erro de carregamento, a ficha cai
 * para ele em vez de virar uma caixa vazia.
 *
 * O ícone de informação junto ao nome do exercício, separado das ações
 * operacionais (substituir, opções da série), segue o padrão do Alpha
 * Progression (workflow-imagens-references/alpha-progression/050 e
 * 062: "Supino reto · Barra ⓘ"): a ficha do exercício não compete com
 * o menu "o que fazer com este exercício".
 *
 * Fechada por padrão — como o timer de descanso em `RegistroSerie` —
 * porque a tela de sessão já é densa; o atleta abre quando tem a
 * dúvida, não a cada série.
 *
 * `DiagramaMuscular` (silhueta com região marcada) continua presente
 * como informação secundária/menor: a animação ensina o movimento, o
 * diagrama diz onde ele bate — papéis que o `CONTEXT.md` distingue.
 */
export function FichaExercicio({
  nome,
  grupo,
  grupoMuscular,
  comoExecutar,
  midiaUrl,
}: {
  nome: string;
  grupo: GrupoMuscular;
  grupoMuscular: string;
  comoExecutar: string;
  /** URL same-origin da animação (`/api/midia-execucao/{id}`); ausente = sem mídia mapeada. */
  midiaUrl?: string;
}) {
  const [aberta, setAberta] = useState(false);
  const [midiaComFalha, setMidiaComFalha] = useState(false);
  const botaoAbrirRef = useRef<HTMLButtonElement>(null);
  const botaoFecharRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const dialogAbertoRef = useRef(false);
  const tituloId = useId();
  const descricaoId = useId();

  useEffect(() => {
    if (!aberta) {
      if (dialogAbertoRef.current) {
        botaoAbrirRef.current?.focus();
        dialogAbertoRef.current = false;
      }
      return;
    }

    dialogAbertoRef.current = true;
    botaoFecharRef.current?.focus();

    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        setAberta(false);
        return;
      }

      if (evento.key !== "Tab") return;

      const dialogo = dialogRef.current;
      if (!dialogo) return;
      const focaveis = Array.from(
        dialogo.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focaveis.length === 0) {
        evento.preventDefault();
        return;
      }

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoPressionarTecla);
    return () => document.removeEventListener("keydown", aoPressionarTecla);
  }, [aberta]);
  const mostrarMidia = Boolean(midiaUrl) && !midiaComFalha;

  return (
    <>
      <Button
        ref={botaoAbrirRef}
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Ver como executar ${nome}`}
        onClick={() => setAberta(true)}
      >
        <Info className="size-4" aria-hidden />
      </Button>
      {aberta ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm">
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            aria-describedby={descricaoId}
            tabIndex={-1}
            className="scrollbar-hidden flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl border-t border-border bg-surface-container p-6 pb-8"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
                  {grupoMuscular}
                </p>
                <h2 id={tituloId} className="text-title font-bold">
                  {nome}
                </h2>
              </div>
              <Button
                ref={botaoFecharRef}
                variant="ghost"
                size="icon"
                aria-label="Fechar ficha do exercício"
                onClick={() => setAberta(false)}
              >
                <X />
              </Button>
            </div>
            {mostrarMidia ? (
              <div className="mb-4 flex items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-container-high p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- GIF same-origin, sem otimização de imagem do Next; fonte nativa 180x180, exibida em ~2x sem esticar além disso */}
                <img
                  src={midiaUrl}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  width={180}
                  height={180}
                  className="h-[min(45vh,360px)] w-[min(45vh,360px)] object-contain"
                  onError={() => setMidiaComFalha(true)}
                />
              </div>
            ) : (
              <div className="mb-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface-container-high py-6">
                <Dumbbell className="size-10 text-muted-foreground" aria-hidden />
                <DiagramaMuscular grupo={grupo} className="h-16" />
              </div>
            )}
            <div>
              <p className="mb-1 text-label-md font-semibold text-muted-foreground">Como executar</p>
              <p
                id={descricaoId}
                className="text-body-md leading-relaxed text-on-surface"
              >
                {comoExecutar}
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
