/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import { ExpirationPlugin, NetworkFirst, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Precache do shell da PWA (ADR 0001).
 *
 * A página da Sessão de Treino recebe uma estratégia própria: rede
 * primeiro, com timeout curto e queda para o cache. É o único ponto
 * do app onde uma tela em branco por falta de rede interrompe uma
 * atividade física em andamento — no resto do produto, esperar a rede
 * é aceitável.
 *
 * O timeout é curto de propósito: numa academia com sinal ruim, o
 * pior caso não é estar offline (o navegador avisa), é a conexão que
 * aceita a requisição e não responde.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request, url }) => request.mode === "navigate" && url.pathname.startsWith("/sessao/"),
      handler: new NetworkFirst({
        cacheName: "sessao-de-treino",
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 })],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
