# Athlyt

PWA mobile-first de uso pessoal para acompanhamento adaptativo de treino, alimentação e evolução corporal, orientada à construção de uma base natural de Men's Physique.

O projeto está na fase de especificação. Consulte `specs/mvp-vertical.md`.

## Desenvolvimento local

```bash
npm run dev          # aplicação apenas — use com um Postgres já disponível
npm run dev:banco    # sobe o Postgres em Docker e então a aplicação
npm run stop         # encerra o Postgres local
```

`dev` não sobe o banco de propósito: o CI e o Playwright fornecem o próprio
Postgres, e acoplar Docker ao `dev` fazia o E2E tentar subir um container onde
não havia nenhum. Use `dev:banco` quando quiser que o Docker também suba.

### Modo produção na máquina local

A instância exposta pelo Tailscale Funnel roda o build de produção, não o
servidor de desenvolvimento. Um comando cobre o ciclo inteiro:

```bash
npm run app:up       # Postgres + build limpo + sobe + espera responder
npm run app:down     # derruba
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
