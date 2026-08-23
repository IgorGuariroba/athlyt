/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist } from "serwist";
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
type DadosPush = {
  title?: string;
  body?: string;
  url?: string;
};

/**
 * Push é tratado no SW, e não em uma página aberta. Assim o lembrete
 * continua nativo quando a PWA está em segundo plano ou instalada.
 * O backend pode enviar apenas `{ body, url }`; os demais campos têm
 * defaults seguros para mensagens do treino.
 */
self.addEventListener("push", (event: PushEvent) => {
  let dados: DadosPush = {};
  try {
    dados = event.data?.json() as DadosPush;
  } catch {
    dados = { body: event.data?.text() };
  }

  const url = typeof dados.url === "string" && dados.url.startsWith("/") ? dados.url : "/inicio";
  event.waitUntil(self.registration.showNotification(dados.title ?? "Athlyt", {
    body: dados.body ?? "Você tem uma atualização do seu treino.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    tag: "athlyt-treino",
    data: { url },
  }));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = typeof event.notification.data?.url === "string" && event.notification.data.url.startsWith("/")
    ? event.notification.data.url
    : "/inicio";

  event.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existente = janelas.find((janela) => janela.url.includes(self.registration.scope));
    if (existente) {
      await existente.focus();
      existente.postMessage({ tipo: "athlyt:limpar-badge" });
      if ("navigate" in existente && !existente.url.endsWith(url)) await existente.navigate(url);
      return;
    }
    await self.clients.openWindow(url);
  })());
});

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
    /**
     * Mídia de Execução (CONTEXT.md): GIF espelhado no R2 e servido por
     * `/api/midia-execucao/{id}` com chave estável e conteúdo imutável.
     * O catch-all de `defaultCache` para `/api/*` usa `NetworkFirst` com
     * só 16 entradas — certo para dados que mudam, errado para mídia que
     * não muda; por isso esta regra vem antes e usa `CacheFirst`. Na
     * academia offline, a animação precisa continuar disponível depois
     * da primeira visita ao exercício.
     */
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/midia-execucao/"),
      handler: new CacheFirst({
        cacheName: "midia-execucao",
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 })],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
