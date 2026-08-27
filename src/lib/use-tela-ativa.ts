"use client";

import { useEffect } from "react";

/**
 * Mantém a tela acesa enquanto o componente estiver montado.
 *
 * Durante a sessão o celular fica na bancada e o atleta olha a próxima
 * série sem tocar no aparelho; o bloqueio automático apagaria a tela
 * justamente no descanso. O wake lock vive apenas enquanto a tela da
 * sessão está montada — ao concluir ou abandonar, a liberação devolve o
 * comportamento normal do aparelho, que é o que o usuário espera fora
 * do treino.
 *
 * O navegador revoga o lock sozinho quando a aba perde visibilidade
 * (trocar de app, atender uma ligação). Por isso o `visibilitychange`
 * reativa o lock ao voltar: sem isso, o treino seguiria sem proteção
 * depois da primeira troca de app, e o efeito pareceria intermitente.
 *
 * A API não existe em todos os navegadores (Safari antigo, contextos
 * não seguros) e `request` rejeita quando o sistema nega. Falhar aqui
 * não pode quebrar a sessão: o degradê é o aparelho apagar a tela como
 * sempre apagou.
 */
export function useTelaAtiva(ativo = true): void {
  useEffect(() => {
    if (!ativo || !("wakeLock" in navigator)) return;

    let sentinela: WakeLockSentinel | null = null;
    let cancelado = false;

    const adquirir = async () => {
      if (cancelado || document.visibilityState !== "visible") return;
      try {
        sentinela = await navigator.wakeLock.request("screen");
      } catch {
        // Bateria baixa ou permissão negada: segue sem manter a tela.
      }
    };

    void adquirir();
    document.addEventListener("visibilitychange", adquirir);

    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", adquirir);
      void sentinela?.release().catch(() => undefined);
    };
  }, [ativo]);
}
