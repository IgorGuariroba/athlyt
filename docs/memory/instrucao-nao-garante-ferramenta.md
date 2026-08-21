---
type: Development Learning
title: "Instrução que manda buscar na ferramenta não impede o modelo de copiar o prompt"
description: "Sem invariante de schema, o agent chama a Ferramenta de Leitura, ignora o resultado e devolve o texto que já estava na instrução — pagando round-trips por nada."
tags: [ia, ferramentas, tool-calling, prompt, latencia, adr-0006]
status: stable
generated:
  by: agente/claude-sonnet-4.6
  at: 2026-08-21T19:00:00Z
sources:
  - id: trilha-plano-inicial
    resource: "decision_trail where operacao='plano-inicial'"
    title: "19–22 chamadas a consultarExercicio por geração, com saída idêntica ao catálogo"
  - id: catalogo-hash
    resource: src/domain/plano/exercicios.ts
    title: "MD5 dos comoExecutar do catálogo, iguais aos 20 devolvidos pelo agent"
---

# Contexto

A operação `plano-inicial` instruía o agent a consultar a ExerciseDB via
`consultarExercicio`, traduzir as instruções e preencher `comoExecutar` de
cada exercício. O catálogo enviado no prompt já continha `comoExecutar`,
como referência. O prompt tinha 17.176 chars de instrução e a geração
levava ~62 s, com 9,1 s até o primeiro token.

# Aprendizado

O modelo chamou a ferramenta 19 a 22 vezes por geração e **descartou todos
os resultados**: os 20 textos devolvidos batiam byte a byte com os do
catálogo estático, confirmado por MD5. A instrução pedia busca externa; o
caminho barato era copiar o que já estava no prompt, e foi o que aconteceu.

Instrução em linguagem natural não é invariante. O que torna uma exigência
mecânica no Athlyt é o schema (ADR 0006) — como `explicacaoAncoradaEm`, que
rejeita a saída se a decisão não citar um dado de origem. Não havia nada
equivalente obrigando `comoExecutar` a diferir do catálogo, então a
exigência era decorativa e o custo, real: tokens nas duas pontas e até 5
round-trips sequenciais dominando o tempo até o primeiro token.

Enviar ao modelo um dado que já se tem, esperando recebê-lo enriquecido, é
uma aposta que só compensa se o schema puder verificar o enriquecimento.

# Aplicação futura

Antes de adicionar uma Ferramenta de Leitura a uma operação, pergunte o que
na saída provaria que ela foi usada. Se nenhum campo do schema puder
distinguir "consultou" de "copiou o prompt", a ferramenta provavelmente não
vai ser usada de verdade — e cada chamada custa um round-trip.

Ao investigar latência de uma operação de IA, meça antes de supor: conte
`ferramentas_consultadas` na Trilha de Decisão e compare a saída com a
entrada. Prompt grande e laço de tool calling têm causas e curas
diferentes, e o laço costuma dominar o TTFT.

Não peça ao modelo um campo que uma tabela estática já resolve. `comoExecutar`
e `justificativa` saíram do schema do plano por isso; ambos vêm do catálogo
em `exercicios.ts`, e o texto personalizado que a tela mostra é
`explicacao.porque`.

# Evidência

Trilha de Decisão, três gerações consecutivas: 19, 18 e 22 chamadas a
`consultarExercicio`.[^trilha-plano-inicial]

Hash dos 20 `comoExecutar` devolvidos pelo agent, comparados aos do
catálogo — todos idênticos.[^catalogo-hash] Exemplo:
`supino-halteres af098df4eef59fecae24bdec96a66a0e` nos dois lados.

Composição da saída de 37.374 chars: `comoExecutar` 5.948 e `justificativa`
3.498, ambos redundantes; `explicacao.porque` 5.527, o único texto
personalizado que as telas renderizam.

[^trilha-plano-inicial]: `decision_trail`, operação `plano-inicial`.
[^catalogo-hash]: `src/domain/plano/exercicios.ts`.
