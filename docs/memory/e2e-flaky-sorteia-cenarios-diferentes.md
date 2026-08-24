---
type: Development Learning
title: "E2E que falha em cenários diferentes a cada rodada é corrida, não regressão"
description: "Regressão é determinística: falha sempre nos mesmos testes. Quando o conjunto de vítimas muda a cada execução e nenhuma se repete, a causa é corrida entre o teste e uma escrita assíncrona, e o diagnóstico se faz comparando execuções, não lendo o diff."
tags: [e2e, playwright, ci, flakiness, diagnostico, server-actions]
status: stable
generated:
  by: agente/claude-sonnet-4-5
  at: 2026-08-24T16:30:00-03:00
sources:
  - id: pr-145-diario-2026-08-24
    resource: "PR #145, runs 32766573773 (3 tentativas do job E2E mobile), e2e/triagem.e2e.test.ts:248"
    title: "Extração da tela do Diário: E2E vermelho em cenários fora do escopo da mudança"
---

# Contexto

No PR #145 (extração da aba Diário para `src/components/diario/`), 5 dos 6
checks passaram e o `E2E mobile` reprovou com 3 falhas — todas em telas que a
mudança não tocava: `avaliacao-corporal`, `mudanca-objetivo` e
`revisao-corporal`. A `main` que servia de base tinha rodado verde 4 h antes,
o que aparentemente incriminava o commit.[^pr-145-diario-2026-08-24]

Três execuções do mesmo job, sem nenhuma alteração de código entre elas:

| Tentativa | Falhas | Cenários |
| --- | --- | --- |
| 1 | 3 | avaliacao-corporal, mudanca-objetivo, revisao-corporal |
| 2 | 1 | triagem (abandonar no meio da cascata) |
| 3 | 0 | — |

Nenhum cenário se repetiu entre as tentativas.

# Aprendizado

**O padrão das falhas distingue as duas causas antes de qualquer leitura de
código.** Uma regressão é determinística: os mesmos testes falham em toda
execução, porque a causa está no artefato. Um conjunto de vítimas que muda a
cada rodada, sem repetição, é corrida — o runner sob carga abre uma janela que
a máquina local não abre.

A falha da segunda tentativa mostra o mecanismo em uma linha:

```
Expected: /triagem/altura
Received: /triagem/sexo
```

O teste clica em "Continuar" e chama `page.goto("/inicio")` sem esperar a
navegação da server action terminar. Se a gravação ainda não concluiu, a
cascata continua apontando para a etapa anterior. O mesmo formato aparece nos
outros três cenários: todos dependem de escrita assíncrona (autosave de
medida, geração de plano, montagem do scorecard) e todos esbarram no timeout
de 5 s.

Reproduzir localmente não basta para absolver nem para condenar, e as duas
comparações que fiz mal custaram tempo: rodar 3 arquivos na branch contra 1
arquivo na `main` (conjuntos diferentes não comparam), e rodar `next dev`
localmente contra `next start` no CI (modos diferentes de execução).

`--repeat-each` é o que converte impressão em evidência: `mudanca-objetivo`
falhou uma vez em 8,1 s e passou 3/3 em 2–3 s logo depois, no mesmo modo de
produção. Tempo de execução discrepante é sinal de timeout raspado, não de
lógica quebrada.

# Aplicação futura

- Diante de E2E vermelho no CI e verde local, **primeiro** compare o conjunto
  de cenários entre execuções sucessivas. Cenários sempre diferentes → corrida;
  cenários fixos → regressão, e aí vale ler o diff.
- Cheque se os testes que falharam tocam arquivos do commit (`git show
  --name-only`). Ausência de interseção é evidência forte, mas só depois do
  teste de repetição.
- Ao comparar branch com `main`, rode **o mesmo conjunto de arquivos e o mesmo
  modo de servidor** (`E2E_COMANDO='npx next start -p 3000'` espelha o CI, que
  serve o build de produção).
- Use `--repeat-each=3` no cenário suspeito antes de concluir qualquer coisa.
- Um `page.goto` logo após ação que dispara server action é o formato que
  produz esse tipo de corrida: espere a URL ou um efeito visível da escrita
  antes de navegar. Corrigir isso é trabalho próprio, em PR separado — não
  se mistura à entrega que apenas foi atingida pelo sintoma.
- Não "conserte" flakiness com espera cega (`waitForTimeout`) para destravar um
  merge: isso troca sinal do CI por falso verde.

# Evidência

Três execuções do job `E2E mobile` sobre o commit `c3a9af9`, sem alteração de
código entre elas, produziram 3, 1 e 0 falhas, sem repetição de cenário. O
commit não tocava nenhum dos arquivos que falharam — `git show --name-only`
lista apenas `src/components/diario/**`, `src/app/(app)/diario/page.tsx`,
`src/arquitetura/**`, `docs/memory/**` e dois E2E do próprio Diário, que
passaram nas três tentativas. `e2e/triagem.e2e.test.ts` tem como último commit
`90006af`, de outra entrega.[^pr-145-diario-2026-08-24]

[^pr-145-diario-2026-08-24]: PR #145, run 32766573773, jobs 97557748439 / 97560092364 / 97561087546.
