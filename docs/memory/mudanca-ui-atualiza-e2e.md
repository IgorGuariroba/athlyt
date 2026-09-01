---
type: Development Learning
title: "Mudança de UI atualiza o E2E no mesmo conjunto"
description: "Toda alteração visual que modifica a interação ou o contrato acessível deve atualizar e executar o cenário E2E equivalente antes do push."
tags: [ui, e2e, acessibilidade, playwright]
status: stable
generated:
  by: agente/gpt-5.6-sol
  at: 2026-07-30T19:50:15-03:00
sources:
  - id: pr-38
    resource: https://github.com/IgorGuariroba/athlyt/pull/38
    title: "PR #38 — etapas de peso e objetivo inspiradas no MacroFactor"
  - id: triagem-e2e
    resource: e2e/triagem.e2e.test.ts
    title: "Jornada E2E da triagem em cascata"
---

# Contexto

As etapas de peso e objetivo foram redesenhadas: o campo numérico virou uma régua com semântica de `slider`, e o texto usado para confirmar o objetivo foi removido. O código foi enviado sem atualizar a jornada E2E, que continuou procurando os controles antigos e bloqueou o PR #38.[^pr-38]

# Aprendizado

Uma mudança visual não termina quando a nova interface compila. Se ela altera como o usuário encontra ou opera um controle — inclusive `role`, nome acessível, rótulo ou estado — o teste E2E dessa jornada faz parte do mesmo conjunto de mudança.

Seletores devem preferir o contrato público e acessível da interface. Textos visuais frágeis não devem ser usados quando existe uma semântica estável. Quando o contrato acessível mudar deliberadamente, o E2E deve mudar junto, e não somente depois de a CI falhar.

# Aplicação futura

Antes de concluir qualquer alteração de UI:

1. Pesquisar nos testes E2E pelos textos, rótulos, papéis e rotas afetados.
2. Atualizar os cenários equivalentes no mesmo commit ou PR.
3. Interagir pelo contrato público (`getByRole` e nome acessível) e verificar o resultado observado pelo usuário.
4. Executar localmente ao menos os cenários E2E afetados, com vídeo, antes do push.
5. Informar o caminho da evidência de vídeo na conclusão.

Uma alteração puramente estética que preserve interação e contrato acessível não exige reescrever o teste comportamental. Cobertura de aparência pixel a pixel, quando necessária, pertence a um teste de regressão visual separado.

# Evidência

No PR #38, o E2E expirou procurando `getByLabel("Peso (kg)")` após esse campo ter sido substituído por um `slider`. O cenário também ainda procurava `"Confirmo este objetivo"`, removido no redesenho. A atualização de `e2e/triagem.e2e.test.ts` para operar os novos controles fez a jornada completa passar localmente.[^triagem-e2e]

[^pr-38]: Fonte `pr-38`.
[^triagem-e2e]: Fonte `triagem-e2e`.
