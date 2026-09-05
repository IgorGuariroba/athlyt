import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { allowEmail, seedAuthenticatedSession } from "./helpers/seed-session";

/** Um deploy anterior na mesma origem, sem publicar seu worker no produto. */
test("retira o worker antigo e seus caches sem apagar dados locais ou outro worker", async ({ page, context }) => {
  let migrado = false;
  const legado = `
    self.addEventListener('install', () => self.skipWaiting());
    self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
  `;
  const server = createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    if (request.url === "/sw.js" || request.url === "/outro/sw.js") {
      response.setHeader("Content-Type", "application/javascript");
      response.end(migrado && request.url === "/sw.js"
        ? await readFile("public/sw.js", "utf8") : legado);
    } else if (request.url === "/desativar-sw.js") {
      response.setHeader("Content-Type", "application/javascript");
      try {
        response.end(await readFile("public/desativar-sw.js", "utf8"));
      } catch {
        response.writeHead(404).end();
      }
    } else {
      response.setHeader("Content-Type", "text/html");
      response.end(`<html><body>Migração${migrado ? '<script src="/desativar-sw.js"></script>' : ''}</body></html>`);
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    await page.goto(origin);
    await context.addCookies([{ name: "authjs.session-token", value: "sessao-preservada", url: origin, httpOnly: true }]);
    await page.evaluate(async () => {
      await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      await navigator.serviceWorker.register("/outro/sw.js", { scope: "/outro/" });
      for (const name of ["sessao-de-treino", "midia-execucao", "pages-rsc-prefetch", "apis", `serwist-precache-v2-${location.origin}/`, "cache-de-outra-funcionalidade"]) {
        const cache = await caches.open(name);
        await cache.put("/exemplo", new Response("preservar apenas o cache alheio"));
      }
      localStorage.setItem("preferencia", "escuro");
      sessionStorage.setItem("rascunho", "pendente");
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("fila-de-treino", 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore("eventos");
        };
        request.onerror = () => {
          reject(request.error ?? new Error("IndexedDB error"));
        };
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("eventos", "readwrite");
          tx.objectStore("eventos").put("serie-pendente", "1");
          tx.oncomplete = () => { db.close(); resolve(); };
        };
      });
    });
    migrado = true;
    await page.reload();
    await expect.poll(() => page.evaluate(async () =>
      (await navigator.serviceWorker.getRegistrations()).map((registration) => new URL(registration.scope).pathname),
    )).toEqual(["/outro/"]);
    await expect.poll(() => page.evaluate(() => caches.keys())).toEqual(["cache-de-outra-funcionalidade"]);
    expect((await context.cookies()).find((cookie) => cookie.name === "authjs.session-token")?.value).toBe("sessao-preservada");
    expect(await page.evaluate(() => [localStorage.getItem("preferencia"), sessionStorage.getItem("rascunho")])).toEqual(["escuro", "pendente"]);
    expect(await page.evaluate(() => new Promise((resolve, reject) => {
      const request = indexedDB.open("fila-de-treino");
      request.onerror = () => {
        reject(request.error ?? new Error("IndexedDB error"));
      };
      request.onsuccess = () => {
        const db = request.result;
        const read = db.transaction("eventos").objectStore("eventos").get("1");
        read.onsuccess = () => { db.close(); resolve(read.result); };
      };
    }))).toBe("serie-pendente");
    await page.reload();
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(1);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});

test("mantém instalação e autenticação sem instalar worker em uma visita nova", async ({ page, context }) => {
  const email = `e2e-turbopack-${Date.now()}@example.com`;
  await allowEmail(email);
  const { cookie, user } = await seedAuthenticatedSession(email);
  await context.addCookies([cookie]);
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = (await manifestResponse.json()) as {
    display: string; name: string; icons: { src: string }[];
  };
  expect(manifest.display).toBe("standalone");
  expect(manifest.name).toContain("Athlyt");
  expect(manifest.icons.length).toBeGreaterThan(0);
  for (const icon of manifest.icons) {
    expect((await page.request.get(icon.src)).ok()).toBe(true);
  }
  const session = await page.request.get("/api/auth/session");
  expect(((await session.json()) as { user: { email: string } }).user.email).toBe(user.email);
  await expect(page.locator('script[src="/desativar-sw.js"]')).toBeAttached();
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
});
