/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Precache do shell da PWA (ADR 0001). A fila de eventos offline da
 * Sessão de Treino — o que de fato mantém a jornada funcional sem
 * rede — chega no ticket "Outbox offline da Sessão de Treino e Coach
 * Local"; este service worker, por ora, só torna o app instalável e
 * cacheia o shell estático.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
