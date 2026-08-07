# syntax=docker/dockerfile:1

# Imagem de produção do app web (Dokploy/Traefik na VPS — ADR 0003).
# Três estágios: dependências, build e runtime enxuto a partir do
# `output: "standalone"` do Next.

# ---------------------------------------------------------------- deps
FROM node:24-alpine AS deps
WORKDIR /app

# `npm ci` exige o par package.json + package-lock.json. Copiados
# sozinhos para que a camada de instalação só invalide quando as
# dependências mudarem, não a cada alteração de código.
COPY package.json package-lock.json ./
RUN npm ci

# --------------------------------------------------------------- build
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `src/db/client.ts` cria o cliente Postgres no topo do módulo e lança
# se `DATABASE_URL` faltar. Como `src/auth/config.ts` o importa, o
# módulo entra no grafo do build — logo a variável precisa existir já
# em build time, não apenas em runtime.
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# O script "build" é `next build --webpack`: o @serwist/next ainda não
# suporta Turbopack e é ele quem gera `public/sw.js`.
RUN npm run build

# -------------------------------------------------------------- runner
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Sem HOSTNAME=0.0.0.0 o server.js escuta apenas em localhost e o
# Traefik do Dokploy não alcança o container.
ENV HOSTNAME=0.0.0.0

# Processo sem privilégios de root.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# `public` inclui o service worker gerado pelo Serwist durante o build.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Insumos do pre-deploy command (`node scripts/migrar.mjs`). O tracing
# do standalone só enxerga o grafo do app, então o migrator e os SQL
# das migrações precisam ser copiados explicitamente.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrar.mjs ./scripts/migrar.mjs
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/postgres ./node_modules/postgres

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
