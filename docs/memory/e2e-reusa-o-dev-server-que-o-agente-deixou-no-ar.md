---
type: Development Learning
title: "E2E reusa servidor deixado na porta e testa o artefato errado"
description: "Com reuseExistingServer, qualquer servidor na porta 3000 substitui o ambiente sob teste e pode produzir tanto falha enganosa quanto falso verde contra um build anterior."
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
  - id: timer-descanso-falso-verde-2026-09-04
    resource: "src/components/sessao/registro-serie.tsx, e2e/safe-area-standalone.e2e.test.ts, .next/static/chunks/app/(app)/sessao/"
    title: "Teste novo passou verde, e passou verde também com a regressão revertida: build velho na porta"
  - id: pre-push-rebuild-falso-vermelho-2026-09-06
    resource: ".git/hooks/pre-push (via husky), e2e/avaliacao-corporal.e2e.test.ts, /proc/66680 (next-server iniciado 17:14 vs .next/BUILD_ID 17:33)"
    title: "Pre-push rebuildou .next com o servidor de produção antigo no ar; ERR_ABORTED na suíte, 8/8 após app:down && app:up"
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

## O falso verde é o modo perigoso, e só a contraprova o revela

Os dois episódios acima falham em vermelho, o que ao menos convoca
investigação. Em 2026-09-04 a mesma armadilha produziu o oposto: um teste
E2E **novo**, escrito para cobrir o timer de descanso sobreposto pela
`BottomNav`, passou 3/3 na primeira execução.[^timer-descanso-falso-verde-2026-09-04]

O verde era vazio. Havia um servidor de produção na porta 3000 de um
build anterior, e `reuseExistingServer` o adotou: a suíte nunca executou
o código-fonte alterado. O bundle servido provava, com um `grep`:

```
bundle testado:  bottom-[calc(5.75rem+var(--safe-bottom))] z-[60]
fonte no disco:  bottom-[calc(7rem+var(--safe-bottom))]    z-[60]
```

Nenhum valor `5.75rem` existia no repositório — era resíduo de um build
velho. Um teste que passa contra código que não é o seu não distingue
correção de coincidência, e o relatório verde encerra a investigação
precisamente quando ela deveria começar.

O que expôs a fraude não foi ler o log, foi **reverter a correção e
exigir que o teste falhasse**. Ele continuou verde — prova de que não
vigiava nada. Só depois de `app:down && app:up` com o defeito no bundle o
teste finalmente acusou `Expected: <= 723, Received: 743`.

Daí a regra: **um teste de regressão só está pronto quando foi visto
falhar contra o defeito que ele descreve.** Para mudança que só existe
depois de compilada — CSS, geometria, layout — a contraprova exige
rebuildar com o defeito, não apenas editar o fonte.

Essa contraprova tem um segundo rendimento: ela mede o alcance real da
correção. Aqui, das duas alterações feitas no componente, só a geometria
do timer minimizado (`bottom-24` → `bottom-[calc(7rem+var(--safe-bottom))]`)
fez o teste falhar ao ser revertida. A elevação do modal (`z-50` → `z-[70]`)
não alterou resultado algum, porque `z-50` já vencia o `z-10` da nav — é
mudança defensável, mas não era o defeito. Sem a contraprova, as duas
teriam sido relatadas como "correção verificada".

## O pre-push inverte o gatilho: reconstrói o artefato sob o servidor vivo, e o vermelho é falso

Os episódios anteriores trocavam o ambiente **antes** do teste começar. Em
2026-09-06 o próprio hook de `pre-push` criou a variante inversa: para validar
um push, ele roda `next build` — reconstruindo `.next` por completo — e em
seguida a suíte E2E, que adota com `reuseExistingServer` o servidor de
produção que o agente havia deixado na porta 3000. O processo (iniciado às
17:14) servia chunks de um diretório reconstruído às 17:33; a navegação abortou
com `net::ERR_ABORTED` em `page.goto`, o hook bloqueou o push, e o vermelho
parecia uma regressão da mudança.[^pre-push-rebuild-falso-vermelho-2026-09-06]

O sintoma é distinto dos anteriores: não é timeout de clique nem botão
desabilitado, é **aborto de navegação** — o servidor responde, o HTML chega,
e os chunks que ele referencia não existem mais no disco. A prova é temporal,
em dois comandos: `ps -o lstart -p <pid do servidor>` contra
`stat -c %y .next/BUILD_ID`. Datas diferentes com o servidor no ar são falso
vermelho garantido; `npm run app:down && npm run app:up` (rebuild completo +
restart, já com cópia dos estáticos) fechou 8/8 no arquivo que falhava.

A regra derivada complementa as anteriores: **todo vermelho obtido depois de
qualquer `next build` é inconclusivo enquanto o servidor na porta não tiver
sido reiniciado** — e o hook de pre-push é justamente o fluxo que builda com
o app de pé, porque o agente valida a UI no servidor de produção antes de
subir.

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

Para mudança que só se manifesta no bundle (CSS, classe utilitária,
geometria), confirmar a porta não basta: confirme que o **artefato**
contém a alteração, com um `grep` no chunk servido antes de dar peso ao
resultado.

```bash
grep -ro "bottom-\[calc(7rem" ".next/static/chunks/app/(app)/sessao/"
```

Sem correspondência, a suíte está testando outro código, e tanto o verde
quanto o vermelho são ruído.

Falha de E2E com `net::ERR_ABORTED` em `page.goto` cai na mesma checagem: datas
do processo e do `BUILD_ID` primeiro, interpretação depois.

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

No episódio de 2026-09-04, a mesma suíte e o mesmo teste em três
ambientes deixam o falso verde à mostra:[^timer-descanso-falso-verde-2026-09-04]

| build servido | código do timer | resultado |
| --- | --- | --- |
| anterior, reusado da porta | `5.75rem z-[60]` (nem o certo, nem o defeito) | `3 passed` — sem valor |
| rebuild com a regressão | `bottom-24 z-40` | `1 failed`: `o timer minimizado invade a barra de navegação` |
| rebuild com a correção | `bottom-[calc(7rem+var(--safe-bottom))] z-[60]` | `9 passed` |

A primeira e a terceira linhas são ambas verdes e significam coisas
opostas. Só a linha do meio dá sentido às outras duas.

Liberada a porta e mantido o banco de pé, os mesmos 3 cenários passaram
em 6,3 s, e a suíte completa fechou 43/43 sem nenhuma alteração de
código.

A outra metade do custo apareceu logo depois: com a suíte verde, o app
ficou fora do ar e o usuário encontrou o error boundary ao abrir
`/dieta`. O diagnóstico levou três comandos e nenhuma leitura de
código — `ss -ltnp | grep :3000` vazio, `curl /api/saude` devolvendo
`000` (exit 7, connection refused) e `docker ps` mostrando apenas o
banco —, mas o tempo perdido foi de quem tentava usar o produto.
