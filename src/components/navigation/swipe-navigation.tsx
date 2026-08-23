"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const ABAS = ["/inicio", "/diario", "/progresso", "/mais"] as const;
const DISTANCIA_MINIMA = 56;

/**
 * Camadas modais (timer de descanso, ficha do exercício) são `fixed`
 * mas vivem **dentro** desta árvore — não há `createPortal`. Sem esta
 * guarda, um arrasto iniciado sobre o modal sobe por bubbling até os
 * handlers de swipe e troca de aba por baixo dele, tirando o atleta da
 * tela sem que ele tenha pedido.
 *
 * Defesa preventiva: nenhuma falha real foi observada, porque o gesto
 * exige `pointerType` de toque. Vale mesmo assim, já que o único
 * cenário não coberto pelos testes é o dedo do usuário.
 *
 * O backdrop conta como camada modal mesmo quando o `role="dialog"`
 * está no filho (`FichaExercicio`): arrastar no escurecido ao redor do
 * painel ainda é um gesto dentro do modal, não na tela de trás.
 */
function dentroDeCamadaModal(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof Element)) return false;
  return alvo.closest('[role="dialog"]') !== null || alvo.querySelector('[role="dialog"]') !== null;
}

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
    if (dentroDeCamadaModal(event.target)) return;

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
    // Um modal pode ter aberto durante o gesto (o timer sobe sozinho ao
    // registrar uma série). Trocar de aba por baixo dele tiraria o
    // atleta da tela sem que ele tenha pedido.
    if (document.querySelector('[role="dialog"]')) return;

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
