"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const ABAS = ["/inicio", "/diario", "/progresso", "/mais"] as const;
const DISTANCIA_MINIMA = 56;

type Gesto = {
  inicioX: number;
  inicioY: number;
  moveu: boolean;
};

/**
 * Permite trocar entre as quatro abas principais com um gesto horizontal.
 * A rolagem vertical continua nativa: só um deslocamento horizontal maior
 * que o vertical dispara a navegação. O efeito de entrada fica no CSS para
 * que a navegação por toque, teclado e BottomNav tenham a mesma transição.
 */
export function SwipeNavigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [direcao, setDirecao] = useState<"adiante" | "atras">("adiante");
  const gesto = useRef<Gesto | null>(null);
  const navegouPorGesto = useRef(false);

  function indiceAtual() {
    const indice = ABAS.findIndex(
      (href) => pathname === href || pathname.startsWith(`${href}/`),
    );
    return indice === -1 ? 0 : indice;
  }

  function aoIniciar(event: React.PointerEvent<HTMLDivElement>) {
    navegouPorGesto.current = false;
    if (event.pointerType === "mouse") return;

    gesto.current = {
      inicioX: event.clientX,
      inicioY: event.clientY,
      moveu: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function aoMover(event: React.PointerEvent<HTMLDivElement>) {
    if (!gesto.current) return;

    const deslocamentoX = event.clientX - gesto.current.inicioX;
    const deslocamentoY = event.clientY - gesto.current.inicioY;
    gesto.current.moveu =
      Math.abs(deslocamentoX) > 8 && Math.abs(deslocamentoX) > Math.abs(deslocamentoY);
  }

  function aoFinalizar(event: React.PointerEvent<HTMLDivElement>) {
    const gestoAtual = gesto.current;
    gesto.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!gestoAtual || !gestoAtual.moveu) return;

    const deslocamentoX = event.clientX - gestoAtual.inicioX;
    if (Math.abs(deslocamentoX) < DISTANCIA_MINIMA) return;

    const indice = indiceAtual();
    const proximoIndice = deslocamentoX < 0 ? indice + 1 : indice - 1;
    if (proximoIndice < 0 || proximoIndice >= ABAS.length) return;

    navegouPorGesto.current = true;
    setDirecao(deslocamentoX < 0 ? "adiante" : "atras");
    router.push(ABAS[proximoIndice]);
  }

  function aoCancelar() {
    gesto.current = null;
    navegouPorGesto.current = false;
  }

  function aoClicar(event: React.MouseEvent<HTMLDivElement>) {
    if (!navegouPorGesto.current) return;
    event.preventDefault();
    event.stopPropagation();
    navegouPorGesto.current = false;
  }

  return (
    <div
      className="swipe-navegacao"
      data-swipe-navigation="true"
      onPointerDown={aoIniciar}
      onPointerMove={aoMover}
      onPointerUp={aoFinalizar}
      onPointerCancel={aoCancelar}
      onClickCapture={aoClicar}
    >
      <div
        key={pathname}
        className="swipe-navegacao__conteudo etapa-transicao"
        data-direcao={direcao}
      >
        {children}
      </div>
    </div>
  );
}
