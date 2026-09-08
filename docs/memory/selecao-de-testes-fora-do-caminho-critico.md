---
type: Development Learning
title: "Selecionar testes por diff só paga se a suíte for o gargalo do pipeline"
description: "Otimizar um job que roda em paralelo economiza zero wall clock; antes de construir seleção por diff, meça o caminho crítico."
tags: [ci, github-actions, testes, vitest, performance, medicao]
status: stable
generated:
  by: agente/claude
  at: 2026-09-08T15:00:00Z
sources:
  - id: issue-205
    resource: https://github.com/IgorGuariroba/athlyt/issues/205
    title: "Selecionar testes por diff com adoção gradual no pré-push e CI"
  - id: amostra-retroativa
    resource: "`gerarRelatorioSombra` (removido em 2026-09-08; ver `git show 0772d32`) sobre 963abe3..892dba2"
    title: "Amostra retroativa de 17 commits em worktree limpa"
  - id: sombra-ci
    resource: "artefatos `evidencias-selecao-testes` das execuções 34141298367, 34149137368, 34160651120, 34160984451, 34227208290, 34227747178"
    title: "Seis execuções reais do job de sombra"
---

# Contexto

A issue #205 propôs selecionar testes pelo diff em três etapas: seletor no pre-push, modo
sombra no CI, ativação no CI. As duas primeiras foram implementadas e mergeadas. A terceira
foi rejeitada pela medição — e o motivo que decidiu não era nenhum dos riscos que a issue
antecipava (falsos negativos, dependências via filesystem, fallback insuficiente).

# Aprendizado

**Antes de otimizar a duração de um job de CI, meça se ele está no caminho crítico.**

Neste repositório, o PR leva 285 s: `build` (60 s) → `e2e` (215 s) = 275 s em série. O job
`unidade` roda em paralelo e leva 67–121 s. Reduzir a suíte unitária a zero economizaria
**0 s de wall clock**. Toda a construção da etapa 3 teria produzido ganho nulo, medido no
único lugar que importa para quem espera o PR.

Dois achados secundários, ambos reais mas não decisivos:

1. **Política conservadora correta quase nunca seleciona.** 17/17 commits históricos e 6/6
   execuções reais caíram em `modo=completo`. Um commit típico daqui toca migration,
   workflow, doc ou apaga arquivo — e cada um desses dispara fallback, corretamente. O
   grafo do Vitest funcionava (1, 6 e 9 arquivos de ~90 nos 3 casos em que foi consultado);
   a política é que raramente chegava nele.
2. **Instrumentação de medição também tem custo recorrente.** O job `sombra` custava 128 s
   de runner por PR. Uma vez respondida a pergunta, mantê-la é desperdício: foi removida
   junto com a decisão.

# Aplicação futura

Ao receber uma proposta de "acelerar os testes" ou "rodar só o que mudou":

1. Primeiro rode `gh run view <id> --json jobs` e some o caminho crítico real (`needs` em
   série), não a soma dos jobs. Se o job alvo não é o mais longo da cadeia serializada, o
   ganho é zero — diga isso antes de escrever código.
2. Se ele estiver no caminho crítico, valide a taxa de fallback contra o histórico real do
   repo *antes* de construir a instrumentação: rodar o seletor sobre ~15 commits passados
   em worktree limpa custa minutos e responde a mesma pergunta que semanas de sombra.
3. Instrumentação de medição em CI deve nascer com data de remoção. Ela não é produto.

Vale também o inverso: aqui o gargalo é o E2E (215 s), que a issue tinha declarado fora de
escopo. Escopo definido antes da medição pode excluir exatamente o alvo que valeria a pena.

# Evidência

Seis execuções do job de sombra reportaram `proporcaoSelecionada: 1` e economia líquida
entre −574 ms e −2 840 ms — negativa porque o seletor custa 0,6–2,2 s e não removia nada.[^sombra-ci]

A amostra retroativa de 17 commits (`963abe3`..`892dba2`), processada com
`gerarRelatorioSombra` em worktree limpa sobre cada commit e seu pai, deu 17/17 em
`modo=completo`: 6 por arquivo sensível (`.github/`, `.githooks/`, `drizzle/`), 6 por caminho
sem mapeamento (`e2e/`, `docs/`, `.gitignore`), 3 por status `D`/`R`, 2 por inventário
indisponível.[^amostra-retroativa]

Tempos do PR #217 (`gh run view 34227208290`): E2E mobile 215 s, unidade 121 s, sombra 128 s,
build 60 s, integração 61 s, lint 82 s, total 285 s.
