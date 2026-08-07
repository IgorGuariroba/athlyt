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
não havia nenhum. Use `dev:banco` (e `start:banco`) quando quiser que o Docker
também suba.

O banco de desenvolvimento escuta a porta **5433** no host, para não colidir com
um Postgres já instalado na 5432.
