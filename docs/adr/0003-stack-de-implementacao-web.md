# 0003 — Stack de implementação do app web

## Status

Aceita — 2026-02-10

## Contexto

A spec (`specs/mvp-vertical.md`) já fixa TypeScript + Next.js App Router (PWA), PostgreSQL, Auth.js/Google, VPS via Dockploy e Vercel AI SDK, mas deixa em aberto as camadas de implementação. As escolhas abaixo foram tomadas em sessão de grilling, cada uma contra alternativas reais.

## Decisões

| Camada | Escolha | Alternativas rejeitadas | Por quê |
|---|---|---|---|
| Fronteira de API | Route Handlers REST por capacidade de domínio, com chave de idempotência | Server Actions (duas fronteiras), tRPC (hostil à fila offline e a testes de contrato) | Uma única fronteira serve UI online, fila offline e a suíte de jornadas que a spec define como seam principal |
| Acesso a dados | Drizzle ORM, migrations em SQL legível | Prisma (engine opaca), Kysely (mais código manual) | Versionamento imutável e auditoria pedem proximidade do SQL real |
| UI | Tailwind v4 + shadcn/ui, tokens do `DESIGN.md` como `@theme` | Tailwind puro (reimplementar ARIA), MUI/Mantine (brigar com o tema) | O visual MacroFactor é custom; shadcn/Radix dá comportamento acessível sem impor estética |
| Dados no cliente | TanStack Query sobre os Route Handlers; RSC nas telas de leitura | Só RSC+fetch, Zustand manual | Sessão de treino exige mutações otimistas, retry idempotente e integração com a fila offline |
| Service Worker | Serwist | SW à mão, Workbox puro | Caminho mantido para PWA no App Router; precache resolvido, fila e notificações ficam custom |
| Storage de objetos | Cloudflare R2 (mídia, fotos e backups criptografados), URLs assinadas | S3 (egress pago), B2 (sem borda), split R2+B2 (dois provedores) | Um provedor S3-compatível com egress zero cobre tudo num app pessoal |
| Testes | Vitest para jornadas via API (fakes por contrato, relógio controlado) + Playwright para E2E mobile com vídeo | Só Playwright (lento p/ matrizes determinísticas), só Vitest (não cobre E2E real) | A spec exige os dois regimes explicitamente |
| Estrutura do repo | Package único: módulos de domínio em `src/`, worker pg-boss como segundo entrypoint da mesma imagem Docker | Monorepo com workspaces | Time de uma pessoa, um deploy; monorepo só se surgir um segundo artefato real |

Decisões com ADR próprio: offline via outbox de eventos custom (ADR 0001), fila de jobs no Postgres com pg-boss (ADR 0002) e OmniRoute self-hosted como conector de IA (ADR 0004).

## Consequências

- O caminho de implementação do MVP está totalmente determinado; nenhuma escolha estrutural resta em aberto antes do scaffold.
- As escolhas priorizam auditabilidade e simplicidade operacional (VPS única, Postgres único, um provedor de storage) sobre escala — coerente com um produto single-user.
- Pontos de revisita declarados: monorepo (segundo artefato), sync engine (offline além da sessão), fila dedicada (múltiplos usuários).
