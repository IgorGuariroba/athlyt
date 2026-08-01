"use client";

import { useSyncExternalStore } from "react";

function assinar(aoMudar: () => void): () => void {
  window.addEventListener("online", aoMudar);
  window.addEventListener("offline", aoMudar);
  return () => {
    window.removeEventListener("online", aoMudar);
    window.removeEventListener("offline", aoMudar);
  };
}

/**
 * Conectividade como fonte externa, e não como estado espelhado em
 * `useEffect`. A diferença importa: espelhar cria uma janela em que o
 * componente já renderizou dizendo "online" enquanto o aparelho já
 * estava sem rede, e é justamente essa janela que faria o badge mentir
 * no momento em que ele é mais lido.
 *
 * `navigator.onLine` só garante o negativo: falso significa sem rede;
 * verdadeiro significa "há interface de rede", não que o servidor
 * responde. O estado "degradado" existe para cobrir essa diferença.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(assinar, () => navigator.onLine, () => true);
}
