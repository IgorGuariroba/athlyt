# Athlyt

PWA mobile-first de uso pessoal para acompanhamento adaptativo de treino, alimentação e evolução corporal, orientada à construção de uma base natural de Men's Physique.

O projeto está na fase de especificação. Consulte `specs/mvp-vertical.md`.

## Desenvolvimento local

```bash
npm run dev          # aplicação apenas — use com um Postgres já disponível
npm run dev:banco    # sobe o Postgres em Docker e então a aplicação
npm run stop         # derruba tudo (app + Postgres) — alias de app:down
```

`dev` não sobe o banco de propósito: o CI e o Playwright fornecem o próprio
Postgres, e acoplar Docker ao `dev` fazia o E2E tentar subir um container onde
não havia nenhum. Use `dev:banco` quando quiser que o Docker também suba.

### Modo produção na máquina local

A instância exposta pelo Tailscale Funnel roda o build de produção, não o
servidor de desenvolvimento. Um comando cobre o ciclo inteiro:

```bash
npm run app:up       # Postgres + build limpo + sobe + espera responder
npm run app:down     # derruba tudo: app + Postgres
npm run app:down:app # derruba só o app, deixando o Postgres no ar
npm run app:status   # estado atual e URL pública
npm run app:logs     # acompanha o log
```

`app:up` sempre reconstrói com `.next` limpo, porque o build incremental já
reaproveitou o chunk antigo de uma rota e serviu a versão anterior. O processo
sobe com `setsid`, de modo a sobreviver ao encerramento do terminal, e o script
só devolve o controle depois que `/api/saude` responde.

Com `output: "standalone"` no `next.config.ts`, `next start` deixa de valer: o
servidor canônico é `.next/standalone/server.js` — o mesmo que a imagem Docker
executa.

O banco de desenvolvimento escuta a porta **5433** no host, para não colidir com
um Postgres já instalado na 5432.

## Deploy em servidor

`docker/compose.prod.yml` descreve a topologia inteira — Postgres, migração,
app e backup — e roda igual em qualquer host com Docker. Copie
`.env.prod.example`, preencha e suba:

```bash
docker compose -f docker/compose.prod.yml --env-file .env.prod up -d
```

A ordem é garantida pelo próprio compose: o banco fica saudável, o serviço
`migracao` aplica as migrações e sai, e só então o app sobe. Não existe janela
em que código novo consulte schema antigo.

### Quem alcança o app

O serviço do app chama-se **`web`** — é esse o nome a informar ao proxy da
plataforma. `app` seria colisão: a rede do Dokploy é compartilhada por todos os
serviços do host e o Compose registra o nome do serviço como alias DNS nela.

O compose **não publica porta no host**. Quem termina o TLS fala com o
container pela rede do Docker:

| Host | Proxy | Porta publicada |
| --- | --- | --- |
| Dokploy | Traefik, via `dokploy-network` | nenhuma |
| VPS avulsa | Caddy/nginx no próprio host | overlay abaixo |

No segundo caso o proxy é um processo do host e precisa de uma porta:

```bash
docker compose -f docker/compose.prod.yml \
               -f docker/compose.prod.porta.yml --env-file .env.prod up -d
```

O overlay publica em `127.0.0.1:3000` (ajustável por `APP_BIND`/`APP_PORT`).
Usá-lo no Dokploy só disputaria a 3000 com o painel, e o deploy falha com
`port is already allocated`.
