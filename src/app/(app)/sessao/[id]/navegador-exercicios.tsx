"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Carrossel nativo dos exercícios da sessão.
 *
 * O conteúdo continua sendo uma rolagem horizontal real: touch, wheel,
 * teclado e momentum do navegador funcionam sem um gesto proprietário. O
 * Scroll Snap apenas faz cada exercício parar alinhado; o índice mantém os
 * atalhos 1–4 e a URL sincronizados.
 */
export function NavegadorExercicios({
  sessaoId,
  indiceInicial,
  concluido,
  nomes,
  children,
}: {
  sessaoId: string;
  indiceInicial: number;
  concluido: boolean[];
  /**
   * O rótulo de cada atalho carrega o nome do exercício, e não a posição:
   * "Abrir exercício 2" não diz a quem navega por leitor de tela qual
   * exercício será aberto, e a posição ainda muda quando há substituição.
   */
  nomes: string[];
  children: ReactNode;
}) {
  const itens = Array.isArray(children) ? children : [children];
  const indiceSeguro = Math.min(Math.max(indiceInicial, 0), Math.max(itens.length - 1, 0));
  const [indiceAtual, setIndiceAtual] = useState(indiceSeguro);
  const trilhoRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<Array<HTMLElement | null>>([]);
  const indiceAtualRef = useRef(indiceSeguro);

  /**
   * O terceiro argumento vai como **string**, e não como objeto `URL`.
   * O SerwistProvider monkey-patcha `history.replaceState` e repassa esse
   * argumento para `messageSW`, que serializa por structured clone — um
   * `URL` não é clonável e derruba a chamada com `DataCloneError`
   * ("URL object could not be cloned"), quebrando o cache de navegação da
   * PWA a cada troca de exercício.
   */
  function atualizarUrl(indice: number) {
    const url = new URL(window.location.href);
    url.pathname = `/sessao/${sessaoId}`;
    url.searchParams.set("exercicio", String(indice));
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  }

  function irPara(indice: number) {
    const card = cardsRef.current[indice];
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    indiceAtualRef.current = indice;
    setIndiceAtual(indice);
    atualizarUrl(indice);
  }

  useEffect(() => {
    const trilho = trilhoRef.current;
    const cardInicial = cardsRef.current[indiceSeguro];
    if (!trilho || !cardInicial) return;

    // Espera o layout inicial para não animar a abertura de um deep link.
    requestAnimationFrame(() => cardInicial.scrollIntoView({ behavior: "auto", block: "nearest", inline: "start" }));

    const observador = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas
          .filter((entrada) => entrada.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visivel) return;
        const novoIndice = Number((visivel.target as HTMLElement).dataset.exercicioIndice);
        if (!Number.isInteger(novoIndice) || novoIndice === indiceAtualRef.current) return;
        indiceAtualRef.current = novoIndice;
        setIndiceAtual(novoIndice);
        atualizarUrl(novoIndice);
      },
      { root: trilho, threshold: [0.6, 0.85] },
    );

    cardsRef.current.forEach((card) => card && observador.observe(card));
    return () => observador.disconnect();
    // O observador deve ser criado uma vez por montagem do carrossel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indiceSeguro]);

  useEffect(() => {
    cardsRef.current.forEach((card, indice) => {
      if (card) card.inert = indice !== indiceAtual;
    });
  }, [indiceAtual]);

  useEffect(() => {
    function aoVoltarOuAvancar() {
      const indice = Number(new URL(window.location.href).searchParams.get("exercicio") ?? 0);
      if (Number.isInteger(indice) && indice >= 0 && indice < itens.length) {
        indiceAtualRef.current = indice;
        setIndiceAtual(indice);
        cardsRef.current[indice]?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "start" });
      }
    }

    window.addEventListener("popstate", aoVoltarOuAvancar);
    return () => window.removeEventListener("popstate", aoVoltarOuAvancar);
  }, [itens.length]);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <nav
        aria-label="Exercícios do treino"
        className="scrollbar-hidden flex snap-x gap-2 overflow-x-auto overscroll-x-contain pb-1 pr-6"
      >
        {itens.map((_, indice) => (
          <Button
            key={indice}
            type="button"
            variant={indice === indiceAtual ? "default" : "outline"}
            size="icon"
            aria-label={`Abrir ${nomes[indice] ?? `exercício ${indice + 1}`}`}
            aria-current={indice === indiceAtual ? "step" : undefined}
            onClick={() => irPara(indice)}
            className={`size-14 shrink-0 snap-start rounded-xl ${indice === indiceAtual ? "border-on-surface-strong bg-on-surface-strong text-background" : "border-border bg-surface-container"}`}
          >
            {concluido[indice] ? <Check className="size-5 text-success" aria-hidden /> : <span className="text-label-lg font-bold">{indice + 1}</span>}
          </Button>
        ))}
      </nav>

      <div
        ref={trilhoRef}
        aria-label="Exercícios da sessão"
        className="scrollbar-hidden flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth"
      >
        {itens.map((item, indice) => (
          <article
            key={indice}
            ref={(elemento) => { cardsRef.current[indice] = elemento; }}
            data-exercicio-indice={indice}
            aria-label={`Exercício ${indice + 1} de ${itens.length}`}
            className="min-w-0 shrink-0 grow-0 basis-full snap-start"
          >
            {item}
          </article>
        ))}
      </div>
    </div>
  );
}
