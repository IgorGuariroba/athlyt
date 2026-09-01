---
type: Development Learning
title: "E2E que trava sem saída é health check do webServer em loop de redirect"
description: "O bypass de sessão de dev redireciona indefinidamente clientes sem cookie jar; o health check do Playwright nunca resolve e a suíte trava antes de iniciar qualquer teste."
tags: [e2e, playwright, nextjs, dev-session, diagnostico, proxy]
status: stable
generated:
  by: agente/claude-opus-4-6
  at: 2026-08-15T00:45:00-03:00
sources:
  - id: proxy-dev-session
    resource: src/proxy.ts, src/auth/dev-session.ts
    title: "Bypass de sessão de desenvolvimento no proxy"
  - id: curl-47
    resource: "curl -sL http://localhost:3000/ → exit 47"
    title: "Loop de redirect reproduzido fora do Playwright"
  - id: config-webserver
    resource: playwright.config.ts
    title: "webServer com url = baseURL e reuseExistingServer"
---

# Contexto

Ao validar uma mudança de UI, `npx playwright test` passou a não produzir
saída alguma: sem lista de testes, sem falha, sem timeout do runner. Vários
comandos foram abortados por esgotarem o tempo do harness, o que fez parecer
lentidão da suíte — a hipótese errada, e cara: `docs/memory/e2e-mede-compilacao-nao-fluxo.md`
já ensina que E2E lento se investiga pelo tempo por teste, mas aqui **nenhum
teste chegou a começar**.

O sinal decisivo apareceu com `DEBUG=pw:test:*`: a última linha era
`pw:webserver HTTP GET: http://localhost:3000/` e nada depois.[^config-webserver]

# Aprendizado

Suíte sem saída nenhuma e suíte lenta são falhas diferentes. Se o log de
`pw:test:*` para em `pw:webserver HTTP GET`, o runner nunca saiu do health
check do `webServer` — o problema está na resposta da `url` configurada, não
nos testes.

A causa aqui é o bypass de sessão de desenvolvimento: sem sessão, o proxy grava
o cookie de dev e redireciona.[^proxy-dev-session] Um cliente que **não guarda
cookies** — o health check do Playwright, e `curl` sem `-c/-b` — recebe o mesmo
redirect para sempre. `/inicio` responde `307 → /inicio` indefinidamente.[^curl-47]

Duas consequências não óbvias:

1. **`reuseExistingServer: true` não protege.** O health check roda mesmo com o
   servidor já no ar; subir o `next dev` à mão antes não evita o travamento.
2. **A app está sadia.** Navegador, `curl` com cookie jar e o uso real funcionam,
   porque todos guardam o cookie. Só o cliente sem cookie jar entra no loop, o
   que faz a falha parecer do teste ou do navegador.

# Aplicação futura

Quando o Playwright não produzir saída, **não trate como lentidão**. Rode o
health check manualmente antes de qualquer outra hipótese:

```bash
curl -sL -o /dev/null -w "%{http_code}\n" http://localhost:3000/; echo "exit=$?"
```

`exit=47` ("too many redirects") confirma o diagnóstico em um comando. Compare
com `curl -c /tmp/cj -b /tmp/cj -L`: se com cookie jar responde `200` e sem
responde 47, o loop é do bypass de sessão, não da rota.

Para rodar E2E autenticado localmente, use o build de produção — que é também o
que o CI faz e o que `docs/memory/e2e-mede-compilacao-nao-fluxo.md` recomenda:

```bash
npm run build
cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
AUTH_URL=http://localhost:3000 E2E_COMANDO="node .next/standalone/server.js" \
  PORT=3000 npx playwright test
```

Três detalhes que custaram tentativas e não estão no `playwright.config.ts`:

- `npx next start` **não funciona** neste projeto (`output: standalone`); o
  comando correto é `node .next/standalone/server.js`, como em `npm start`.
- O standalone não copia `.next/static` nem `public`; sem isso a app sobe sem
  CSS e os seletores continuam encontrando a página, mascarando o erro.
- `AUTH_URL` precisa casar host e porta, senão a sessão semeada não é
  reconhecida e o teste falha na tela de login — a armadilha já registrada em
  `docs/memory/e2e-auth-url-local.md`, que aparece igual em produção.

Ao rodar comandos longos no harness, use `setsid ... > log 2>&1 &` e leia o log
por polling. Um comando abortado deixa processos órfãos que seguram porta e
disputam o `.next/dev/lock`, produzindo um segundo travamento que já não tem
relação com a causa original.

# Evidência

Com o loop ativo, `DEBUG=pw:test:*` termina em `pw:webserver HTTP GET` e o
processo fica em `ep_poll` sem workers nem navegador; `--list` continua
respondendo `exit=0`, provando que a coleta funciona e a execução não.[^config-webserver]

O mesmo teste que travava indefinidamente passou em **4,0 s**, e a suíte
completa em **58,2 s (29/29)**, após trocar o servidor pelo standalone com
`AUTH_URL` casado — sem nenhuma alteração nos testes.[^curl-47]

[^proxy-dev-session]: Consulte `sources` com id `proxy-dev-session`.
[^curl-47]: Consulte `sources` com id `curl-47`.
[^config-webserver]: Consulte `sources` com id `config-webserver`.
