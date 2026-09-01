---
type: Development Learning
title: "E2E reusa o `next dev` deixado no ar e falha por overlay, não por bug"
description: "Com reuseExistingServer, qualquer servidor esquecido na porta 3000 substitui o ambiente sob teste: o dev server oclui a bottom nav com o overlay, e um servidor de produção sem as variaveis do E2E desliga o dublê de IA. Nos dois casos, timeout sem erro algum na aplicação."
tags: [e2e, playwright, nextjs, dev-server, falso-positivo, diagnostico]
status: stable
generated:
  by: agente/claude-opus-4-6
  at: 2026-08-28T16:30:00-03:00
sources:
  - id: abas-dieta-treino-2026-08-28
    resource: "playwright.config.ts (webServer.reuseExistingServer), src/components/navigation/bottom-nav.tsx, logs de watch mtdca7ln e mtdcgibg"
    title: "Suíte E2E na reorganização das abas: 6 falhas contra dev server, 40/40 contra next start"
  - id: app-up-sem-duble-2026-08-30
    resource: "scripts/app-local.sh, playwright.config.ts (OPENROUTER_BASE_URL), /proc/<pid>/environ"
    title: "3 falhas com app:up na porta: servidor de produção correto, sem as variáveis do E2E"
---

# Contexto

Durante a separação das abas Dieta e Treino, subi `npm run dev` para inspecionar as telas e deixei o processo no ar. A suíte E2E seguinte acusou 6 falhas. O log do Playwright repetia, em todas, a mesma linha:

```
<nextjs-portal></nextjs-portal> from <script data-nextjs-dev-overlay="true">…</script> subtree intercepts pointer events
```

O console do browser estava limpo, o `page snapshot` mostrava a tela renderizada corretamente e o servidor não registrava erro. Os testes morriam por timeout de clique.

O `playwright.config.ts` define `webServer.command` como `npx next start` — build de produção, sem overlay — mas com `reuseExistingServer: true`. Como a porta 3000 já estava ocupada, o Playwright **reusou o dev server** em vez de subir o de produção. A suíte inteira rodou contra o compilador e o overlay.

A armadilha secundária foi diagnosticar o sintoma: movi `devIndicators.position` para `bottom-right`, o que apenas transferiu a oclusão da primeira aba (Dieta) para a última (Mais). Numa bottom nav que ocupa a largura toda, **nenhum canto é seguro** — o indicador do Next é ancorado num canto inferior, e ali sempre haverá uma aba.

Encerrado o dev server e revertida a config, a mesma suíte fechou 40/40 contra `next start`.

# Aprendizado

`reuseExistingServer: true` silenciosamente troca o ambiente sob teste pelo que estiver na porta. Um dev server esquecido pelo agente converte a suíte inteira em falso positivo, com sintomas que imitam bug de UI: elemento visível, estável, e mesmo assim não clicável.

Duas regras derivam disso:

1. **Antes de rodar E2E, garanta que a porta está livre.** Se o agente subiu `npm run dev` para inspeção visual, mate o processo antes da suíte. Falha em E2E com dev server no ar não é evidência sobre o produto.
2. **`intercepts pointer events` vindo de `nextjs-portal` nunca é bug da aplicação.** É o overlay de dev. Não corrija movendo o indicador: corrija o ambiente.

Sinal de reconhecimento rápido: falhas em massa, espalhadas por arquivos sem relação entre si, todas por timeout de clique e sem nenhum erro de console — o denominador comum é o ambiente, não o código.

## O gatilho não é "dev server": é qualquer processo na porta

A leitura de 2026-08-28 nomeava o culpado como `next dev`, e isso deixou
um caso descoberto. Em 2026-08-30 a mesma armadilha reapareceu com um
servidor **de produção** — `npm run app:up`, subido para o usuário
conferir a tela — e nenhum sintoma de overlay: os 3 cenários de
`registro-retroativo` deram timeout clicando em "Estimar calorias e
macros", com o botão `disabled`.[^app-up-sem-duble-2026-08-30]

O `playwright.config.ts` sobe o servidor com
`OPENROUTER_BASE_URL=http://127.0.0.1:4311/v1`, apontando para o dublê
de IA. O servidor do `app:up` não tem essa variável: ele falava com o
OpenRouter real, a estimativa nunca voltava e o botão ficava desabilitado
para sempre. O build estava correto, a aplicação estava correta — faltava
o ambiente que o teste declara.

A generalização correta é: **`reuseExistingServer` só é seguro quando o
processo na porta foi subido pelo próprio Playwright**. Servidor de
produção local, container, túnel ou dev server — todos substituem o
ambiente sob teste, cada um com um sintoma diferente.

# Aplicação futura

Ao investigar falha de E2E, verifique primeiro **contra o que a suíte rodou**. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` antes de disparar a suíte; se responder, descubra qual processo é o dono antes de interpretar qualquer resultado.

Quando houver processo na porta, a checagem decisiva é ler o ambiente
dele e comparar com o que o `webServer` declara:

```bash
tr '\0' '\n' < /proc/$(ss -ltnp | grep :3000 | grep -oP 'pid=\K[0-9]+')/environ \
  | grep -E "OPENROUTER_BASE_URL|AUTH_URL"
```

Saída vazia significa que a suíte rodaria sem o dublê de IA e sem a
`AUTH_URL` casada — dois modos de falha que imitam bug de produto.

Derrubar o servidor exige atenção a um efeito colateral: `npm run
app:down` remove também o container do Postgres, de que o E2E depende.
A sequência correta para liberar a porta preservando o banco é
`npm run app:down && npm run db:up`.

Esse conflito é recorrente por construção: o mesmo agente que sobe o app
para o usuário ver a tela precisa da porta livre para validar por E2E.
Tratar "subir para inspeção" e "rodar a suíte" como estados mutuamente
exclusivos evita interpretar como regressão o que é ambiente.

E a transição tem duas metades. Derrubar o app para rodar a suíte **exige
subi-lo de volta ao terminar**: o usuário usa a porta 3000 como ambiente
real, e um servidor ausente não se anuncia como ausente — aparece como
"Não foi possível carregar esta tela", que é o error boundary da
aplicação fazendo seu trabalho e parecendo defeito do produto. O ciclo
completo é `app:down && db:up` → suíte → `app:up`, e a última etapa não
é opcional só porque a validação terminou.

Ao bisseccionar com `git stash` para separar regressão de falha pré-existente, lembre que o resultado só é válido se ambas as execuções usaram o mesmo servidor. Nesta investigação, `registro-por-foto` foi classificado como "pré-existente" justamente porque as duas rodadas da bissecção usaram o dev server — e ele passa normalmente em produção.

# Evidência

Mesma suíte, mesmo commit, dois ambientes:[^abas-dieta-treino-2026-08-28]

- contra `next dev` reusado: `6 failed, 34 passed (3.6m)`, todas com `nextjs-portal … intercepts pointer events`;
- contra `next start` após `npm run build`: `40 passed (1.2m)`.

As falhas atingiam `diario`, `fotos-r2`, `registro-por-foto`, `sessao` (dois casos) e `substituicao` — arquivos sem relação funcional entre si, o que apontava para causa ambiental e não para regressão da mudança de abas.

No episódio de 2026-08-30, o mesmo padrão com outro
sintoma:[^app-up-sem-duble-2026-08-30] 3 de 3 cenários reprovados,
**incluindo os dois que a mudança não tocava** — uma regressão real teria
derrubado apenas o cenário novo. A confirmação veio em um comando:

```
$ tr '\0' '\n' < /proc/35034/environ | grep -E "OPENROUTER_BASE_URL|AUTH_URL"
(vazio)
```

Liberada a porta e mantido o banco de pé, os mesmos 3 cenários passaram
em 6,3 s, e a suíte completa fechou 43/43 sem nenhuma alteração de
código.

A outra metade do custo apareceu logo depois: com a suíte verde, o app
ficou fora do ar e o usuário encontrou o error boundary ao abrir
`/dieta`. O diagnóstico levou três comandos e nenhuma leitura de
código — `ss -ltnp | grep :3000` vazio, `curl /api/saude` devolvendo
`000` (exit 7, connection refused) e `docker ps` mostrando apenas o
banco —, mas o tempo perdido foi de quem tentava usar o produto.
