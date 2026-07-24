import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  /**
   * @serwist/next injeta um `webpack()` no config mesmo com `disable`
   * ativo (ver node_modules/@serwist/next/src/index.ts). A partir do
   * Next.js 16, Turbopack (padrão em dev) recusa iniciar quando existe
   * um `webpack` config sem `turbopack` explícito. Como o build de
   * produção roda via `next build --webpack` (script "build"), este
   * objeto vazio só destrava o `next dev` com Turbopack.
   */
  turbopack: {},
};

/**
 * @serwist/next ainda não suporta Turbopack (ADR — ver comentário em
 * src/app/sw.ts). Desativado em dev; o build de produção roda com
 * `next build --webpack` (ver script "build" em package.json) para
 * que o service worker seja de fato gerado.
 */
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

export default withSerwist(nextConfig);
