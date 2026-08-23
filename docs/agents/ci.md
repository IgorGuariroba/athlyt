# CI e proteção da branch main

## Esteira

`.github/workflows/ci.yml` roda em `push` para `main` e em todo `pull_request`:

| Job | Portão |
| --- | --- |
| `estatica` | `npm run lint` + `npm run typecheck` + governança do design system |
| `unidade` | `npm run test:unit` — sem infraestrutura |
| `integracao` | `npm run test:int` — Postgres 16 efêmero + migrations |
| `build` | `npm run build` (Next em modo produção) |
| `e2e` | Playwright mobile contra Postgres 16 efêmero; publica vídeo/trace como artefato |

`e2e` depende apenas de `build`, porque só o artefato do build é
pré-requisito real. Antes ele esperava também `estatica`, `unidade` e
`integracao`: como `estatica` levava 5,5 min (4 min 16 s só de render das
stories), o E2E — o único portão que exercita o produto de verdade — começava
no minuto 6 de uma esteira de 8. Em paralelo, uma falha barata continua
reprovando o PR; ela apenas não serializa mais a esteira.

### Fora do CI de PR

Dois workflows saíram de `ci.yml` porque respondem a coisas que não são o
commit:

| Workflow | Gatilho | Motivo |
| --- | --- | --- |
| `.github/workflows/galeria.yml` | diário, manual e PR que toque `src/components/**`, `globals.css` ou `.storybook/**` | render + a11y das stories custam 4 min 16 s; a galeria é referência visual, não regressão de produto |
| `.github/workflows/auditoria.yml` | diário, manual e PR que toque `package.json`/`package-lock.json` | `npm audit` muda por publicação de CVE, não por commit — como portão de PR reprovava mudanças sem relação com a vulnerabilidade |

Na galeria continuam os dois passos com propósitos distintos:
`storybook:build` compila, e `storybook:verificar` abre cada story em
navegador porque o Storybook desenha erro de execução na moldura dele e sai
com código 0 (`docs/memory/galeria-compila-mas-nao-renderiza.md`).

## Níveis de teste

O nível de cada teste está no nome do arquivo, não numa lista mantida à mão:

| Sufixo | Nível | Dependências | Comando |
| --- | --- | --- | --- |
| `*.unit.test.ts` | unitário | nenhuma | `npm run test:unit` |
| `*.int.test.ts` | integração | Postgres migrado | `npm run test:int` |
| `*.e2e.test.ts` | ponta a ponta | app + Postgres + navegador | `npm run test:e2e` |

Os dois primeiros são projects do Vitest (`vitest.config.mts`); o terceiro roda
no Playwright, a partir de `e2e/`.

Um arquivo `.test.ts` **sem sufixo não é coletado por nenhum project** — é
falha barulhenta de propósito, preferível a um teste que silenciosamente nunca
roda. Ao criar um teste, escolha o sufixo pela dependência real: se ele precisa
de banco para passar, é `.int`.

O job `unidade` não provisiona Postgres deliberadamente. Isso mantém o portão
rápido honesto: um `.unit` que passe a exigir banco falha no CI, em vez de
ficar verde escondendo a dependência.

Fora do CI de propósito: `npm run ia:verificar` chama a OpenRouter real
(custo, segredo e flakiness). Rode manualmente ao mexer no conector de IA.

## Proteção da main

O repositório é **público** — foi essa a decisão que destravou rulesets no
plano Free (em repo privado Free, a API responde HTTP 403). Antes de publicar,
o histórico foi varrido: nenhum `.env` versionado, nenhuma chave/token em
qualquer commit, um único autor. Publicar é irreversível quanto ao histórico;
refaça essa varredura antes de qualquer mudança de visibilidade.

O ruleset `main protegida` (id 20077396) está **ativo** e sem bypass actors —
nem o dono da conta escapa. Verificado empiricamente: um push direto na `main`
é recusado com `Changes must be made through a pull request` +
`5 of 5 required status checks are expected`.

Regras em vigor:

```
gh api repos/:owner/:repo/rulesets/20077396
```

Além do ruleset, estão ligados secret scanning e **push protection** — este
último barra o push de um segredo antes de ele entrar no histórico, que é o
risco novo criado por ser público.

### Fluxo de trabalho

```
git switch -c minha-mudanca
# ... commits ...
git push -u origin minha-mudanca
gh pr create --fill
gh pr merge --squash   # só passa com os 5 checks verdes
```

O hook local `.githooks/pre-push` (ative com `git config core.hooksPath .githooks`)
virou conveniência, não portão: adianta lint/typecheck/testes antes de gastar
uma rodada de CI. A garantia real está no servidor.

### O que cada regra impede

- `deletion` / `non_fast_forward`: apagar a `main` ou reescrever seu histórico com force-push.
- `pull_request`: commit direto na `main`; toda mudança passa por PR. Aprovações
  exigidas estão em `0` — num repo de autor único, exigir 1 review tornaria
  impossível mesclar o próprio PR. Ao entrar a segunda pessoa, suba para 1.
- `required_status_checks` com `strict: true`: merge com check vermelho **ou**
  com o branch desatualizado em relação à `main` — este segundo caso é o que
  pega a regressão semântica, em que dois PRs verdes isolados quebram ao juntar.

Os `context` precisam bater exatamente com o `name:` de cada job em `ci.yml`.
Se renomear um job, renomeie aqui — um context que não existe mais deixa de ser
exigido silenciosamente, e o portão some sem aviso.

Pior que sumir: um context exigido cujo job **não roda** naquele PR deixa o
merge preso para sempre, esperando um check que nunca vai chegar. Foi por isso
que `Auditoria de dependências` saiu da lista ao virar condicional por
`paths` — só entra no ruleset job que roda em todo PR.
