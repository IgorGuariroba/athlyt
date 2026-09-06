import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Saída autocontida para a imagem Docker de produção (Dokploy).
   * Sem isso, o runtime precisaria do `node_modules` completo — várias
   * centenas de MB, incluindo devDependencies. O `standalone` emite
   * `.next/standalone/server.js` já com o subconjunto de dependências
   * que o tracing do Next comprovou ser alcançável pelo app.
   */
  output: "standalone",

  /**
   * O Next infere a raiz do workspace procurando lockfiles nos
   * diretórios acima. Um `package-lock.json` solto no home do
   * usuário faz a inferência subir demais e o standalone sair
   * aninhado em `.next/standalone/<caminho>/server.js`, quebrando
   * tanto o start local quanto os COPY do Dockerfile. Fixar a raiz
   * no próprio projeto torna a saída estável em qualquer máquina.
   */
  outputFileTracingRoot: __dirname,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "exercise-dataset.com", pathname: "/images/flat/**" },
    ],
  },

  // A mesma raiz em dev e build, sem inferir lockfiles fora do projeto.
  turbopack: { root: __dirname },

  headers() {
    return Promise.resolve([{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-store" }] }]);
  },

  /**
   * O envio de fotos corporais (`/triagem/avaliacao-corporal/fotos`) faz
   * uma Server Action por pose, e não uma com os quatro arquivos: o
   * corpo é pequeno por construção. O padrão de 1 MB ainda assim
   * rejeitaria com 413 — antes de a action rodar, sem erro na tela —
   * uma foto de celular sem redução no cliente. Este limite é a rede de
   * segurança para quem não tiver `createImageBitmap`/WebP no canvas.
   */
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
