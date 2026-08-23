---
type: Development Learning
title: "E2E frágil e E2E lento costumam ser o mesmo problema: falta camada de interação"
description: "Fluxo de UI copiado em vários arquivos faz uma mudança de tela quebrar em N lugares, e a espera cega escrita para contornar a duplicação é justamente o que torna a suíte lenta."
tags: [e2e, playwright, manutencao, performance, refatoracao]
status: stable
generated:
  by: agente
  at: 2026-08-23T20:45:00-03:00
sources:
  - id: helper
    resource: e2e/helpers/sessao.ts
    title: "Camada de interação da sessão de treino"
  - id: navbar
    resource: e2e/navbar-visivel.e2e.test.ts
    title: "Cenário mais lento antes da extração (10,7 s)"
---

# Contexto

Dois incômodos foram relatados juntos: o E2E demorava e quebrava a cada
mudança de UI. A contagem mostrou que tinham uma causa só — `e2e/helpers/`
continha apenas `seed-session.ts`, que cuida de *dados*. Nenhum helper de
*interação* existia, então cada teste repetia o fluxo da tela:

- `input[name="cargaKg"]:not(:disabled)` em 13 lugares, 5 arquivos;
- "iniciar treino → registrar série → concluir" duplicado em 4 arquivos.

# Aprendizado

Os dois sintomas se alimentam. Sem um lugar único para "concluir o treino",
cada arquivo improvisa a espera do botão que fica atrás do timer, e a
improvisação vira laço fixo com espera cega:

```js
for (let tentativa = 0; tentativa < 8; tentativa += 1) {
  await botao.click({ timeout: 5_000 }).catch(() => {});   // engole erro real
  if (await concluido.isVisible().catch(() => false)) break;
  await page.waitForTimeout(500);                          // paga sempre
}
```

Isso custa 500 ms por volta mesmo quando o clique já funcionou, e o
`catch(() => {})` transforma "botão sumiu" em teste lento em vez de teste
vermelho. Trocado por `expect.toPass`, que usa o backoff do próprio
Playwright, o cenário da navbar caiu de **10,7 s para 5,7 s (−47%)** sem
perder uma asserção.

O seletor de DOM cru (`input[name=...]`) não precisa ser eliminado de
imediato: basta que exista **uma vez**. Concentrado no helper, trocá-lo por
nome acessível vira mudança barata; espalhado, é o que faz uma alteração de
UI quebrar cinco arquivos.

# Aplicação futura

Ao escrever E2E, separe as duas camadas: `helpers/seed-*.ts` para estado, e
`helpers/<fluxo>.ts` para interação. O teste deve narrar a jornada
(`await registrarSerie(page, 1)`), não operar a árvore do DOM.

Quando um cenário parecer flaky e for "consertado" com `waitForTimeout` ou
`catch(() => {})`, trate como dívida, não como solução: use `expect.toPass`
ou espera de condição real, e mova o trecho para o helper.

Antes de propor apagar uma suíte por fragilidade, meça a origem:

```
grep -ohE "getBy(Role|Text|Label|TestId)|locator\(" e2e/**/*.ts | sort | uniq -c | sort -rn
git log --oneline -- e2e/ | wc -l
```

No caso, 41 commits tocaram `e2e/` e apenas 1 era conserto de teste — os
demais acompanhavam mudança de produto, que é o teste funcionando.

# Evidência

`navbar-visivel.e2e.test.ts`: 10,7 s antes, 5,7 s depois, medido com
`next start` (o mesmo modo do CI), mesmo teste e mesma máquina.[^navbar] A
extração removeu 111 linhas e adicionou 68 nos 4 arquivos convertidos; as 13
ocorrências do seletor de carga viraram 1, dentro do helper.[^helper]

Ao rodar a suíte completa, `sessao.e2e.test.ts` › "Mídia de Execução"
falhou — mas falha igual com o `e2e/` original em stash: é o R2 configurado
no `.env` local servindo a imagem que o CI, sem R2, devolve como 404.
Verificar a falha contra o código anterior separou o defeito de ambiente da
regressão de refatoração.

[^navbar]: `npx playwright test navbar-visivel` com e sem a mudança em stash.
[^helper]: `e2e/helpers/sessao.ts`.
