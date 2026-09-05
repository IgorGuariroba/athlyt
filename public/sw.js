/*
 * Worker de desativação: manter este URL para aparelhos que ainda executam
 * o antigo Serwist, inclusive quando a página vem do cache do deploy anterior.
 * Não registra fetch nem faz precache. A atualização automática do navegador
 * também executa esta migração sem depender do JavaScript do novo layout.
 */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Substitui o worker antigo nas abas abertas antes de retirar seu registro.
    await self.clients.claim();

    // Nomes usados pelo antigo src/app/sw.ts e por @serwist/next 9.5 defaultCache.
    // Não apagar caches por prefixo: outra aplicação pode compartilhar a origem.
    const cachesAntigos = new Set([
      `serwist-precache-v2-${self.registration.scope}`,
      "sessao-de-treino",
      "midia-execucao",
      "google-fonts-webfonts",
      "google-fonts-stylesheets",
      "static-font-assets",
      "static-image-assets",
      "next-static-js-assets",
      "next-image",
      "static-audio-assets",
      "static-video-assets",
      "static-js-assets",
      "static-style-assets",
      "next-data",
      "static-data-assets",
      "apis",
      "pages-rsc-prefetch",
      "pages-rsc",
      "pages",
      "others",
      "cross-origin",
    ]);
    await Promise.all((await caches.keys())
      .filter((name) => cachesAntigos.has(name))
      .map((name) => caches.delete(name)));

    // Cookies, local/sessionStorage e IndexedDB (registros pendentes) ficam intactos.
    await self.registration.unregister();
  })());
});
