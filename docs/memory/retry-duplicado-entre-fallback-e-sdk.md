---
type: Development Learning
title: "Retry do fallback de domínio empilhava com o retry default do AI SDK"
description: "`generateText` sem `maxRetries` aplica 2 retentativas com backoff próprias por baixo de um fallback que já retenta — dobrando a espera numa rota com limite de taxa sem ganho de segurança."
tags: [ia, ai-sdk, retry, fallback, e2e, performance, decidir]
status: stable
generated:
  by: agente/claude
  at: 2026-09-08T15:40:00Z
sources:
  - id: decidir-ts
    resource: "src/domain/ia/decidir.ts:239-248"
    title: "Chamada de generateText dentro do executor de decisões de IA"
  - id: fallback-modelo-ts
    resource: "src/domain/ia/fallback-modelo.ts"
    title: "executarFallbackDeModelo: até 2 chamadas por rota, avança ao esgotar"
  - id: medicao-registro-por-foto
    resource: "npx playwright test e2e/registro-por-foto.e2e.test.ts --repeat-each=3"
    title: "Antes/depois de maxRetries: 0 na chamada com rota"
---

# Contexto

Investigando por que o job `E2E mobile` do CI concentrava 44s em só 3 testes
(`registro-por-foto.e2e.test.ts`), a causa não era infraestrutura nem volume
de testes — era retry duplicado em duas camadas que nunca foram desenhadas
juntas.

`fallback-modelo.ts` implementa a política de retry do domínio:
`executarFallbackDeModelo` tenta cada rota aprovada até 2 vezes e avança para
a próxima ao esgotar, com prazo compartilhado e progresso reportado à UI. É
deliberado e testado.[^fallback-modelo-ts]

Por baixo, `decidir.ts` chamava `generateText` do AI SDK sem `maxRetries`
explícito. O SDK aplica o próprio default — 2 retentativas, backoff
exponencial (`initialDelayInMs: 2000`, `backoffFactor: 2`) — e trata HTTP 429
como retryable. Cada uma das 2 chamadas do fallback já embutia até 3
tentativas do SDK.[^decidir-ts]

# Aprendizado

**Quando uma camada de domínio já decide "quantas vezes tentar e quando
desistir", qualquer retry embutido de uma dependência por baixo dela deve ser
desligado explicitamente — silêncio na configuração não significa "sem
retry", significa "o default da lib decide por você, sem que ninguém tenha
pedido".**

O sintoma apareceu primeiro como lentidão de E2E (o mock do servidor IA
devolve 429 permanentemente numa rota, de propósito, para exercitar o
fallback), mas a causa é de produção: um usuário real cuja rota primária
esteja com rate limit esperava ~12s de backoff redundante (2 chamadas × até
~6s de backoff do SDK) antes do fallback do domínio sequer avançar para a
próxima rota — tempo que o desenho de `fallback-modelo.ts` já deveria
controlar sozinho.

A correção não é ampla: `maxRetries: 0` vale só na chamada que passa `rota`
(dentro do fallback). Chamadas sem `rota` (a maioria das operações — plano,
refeição por texto, copiloto de sessão) não têm `executarFallbackDeModelo`
por baixo, e ali o retry do SDK continua sendo a única rede de segurança.

# Aplicação futura

- Ao envolver uma chamada de SDK com lógica de retry/fallback própria,
  confira explicitamente se o SDK tem retry default e desligue-o na parte
  que a camada de domínio já cobre. Não assuma que "não configurei retry"
  significa "não há retry".
- Diante de um E2E lento concentrado em poucos testes que exercitam
  fallback/erro de propósito, suspeite de retry duplicado antes de otimizar
  infraestrutura (paralelismo, seleção de testes): meça o tempo por teste
  (ver `e2e-mede-compilacao-nao-fluxo.md`) e leia a cadeia de chamadas até a
  rede.
- Depois de zerar retry duplicado, valide com `--repeat-each` que o teste
  continua estável — o objetivo é remover espera redundante, não mudar o
  que é retryable.

# Evidência

`registro-por-foto.e2e.test.ts` (3 testes, todos exercitam o fallback real
com a rota 1 sempre em 429): 44,5s → 7,7s isolado; 9/9 estável em
`--repeat-each=3`, tempos consistentes entre rodadas (3,6–4,8s / 0,6–0,8s /
2,2s). Suíte E2E completa: 52/52 passaram, execução de 2,0min para
1,6min.[^medicao-registro-por-foto]

[^medicao-registro-por-foto]: Consulte `sources` com id `medicao-registro-por-foto`.
