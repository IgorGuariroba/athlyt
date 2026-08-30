---
type: Development Learning
title: "Campo controlado não pode normalizar o valor durante a digitação"
description: "trim() numa função chamada a cada tecla apaga o espaço no keystroke em que ele é digitado; e fireEvent.change com o texto pronto passa mesmo com o defeito presente."
tags: [react, formularios, dominio, testes, ui, diagnostico]
status: stable
generated:
  by: agente/claude-sonnet
  at: 2026-08-30T12:00:00Z
sources:
  - id: renomear
    resource: src/domain/alimentos/prato.ts (renomearItem)
    title: "trim() no caminho de renomear, chamado por campo controlado"
  - id: teste-cego
    resource: src/components/diario/__tests__/registro-retroativo.unit.test.tsx
    title: "Teste com fireEvent.change que passava com o bug presente"
  - id: relato
    resource: "sessão de 2026-08-30, captura da revisão de estimativa"
    title: "não consigo editar o refrigerante para coca cola zero"
---

# Contexto

Na revisão da estimativa da refeição, o atleta não conseguia corrigir
"Refrigerante de cola" para "Coca cola zero": as letras apareciam, mas
os espaços não. O texto digitado saía como "Cocacolazero".

O campo é controlado pela descrição do item, e cada tecla passava por
`renomearItem`, que fazia `nome.trim()`.[^renomear] Como o resultado
volta a alimentar o `value` do input, o espaço final era removido no
mesmo keystroke em que era digitado — antes de o usuário conseguir
escrever a próxima letra. Nenhum nome de mais de uma palavra podia ser
corrigido.

# Aprendizado

`trim()` numa função de domínio é inofensivo sobre texto final e
destrutivo sobre texto em digitação. A distinção não está na função,
está em quem a chama: um campo controlado a executa a cada tecla, então
o valor que ela recebe é sempre intermediário — inclusive o espaço que
ainda vai ser seguido de outra palavra.

Normalização pertence à fronteira que persiste, não ao caminho de
edição. No caso, `registrarConsumoRealAction` já fazia `trim` antes de
gravar; o `trim` do meio da digitação não protegia nada e quebrava o
campo.

O segundo aprendizado é sobre o teste que não pegou. Havia cobertura
para "corrigir o alimento preserva os macros", verde o tempo todo:

```js
fireEvent.change(campo, { target: { value: "Arroz integral cozido" } });
```

Um `change` único entrega o texto **pronto** e nunca produz o estado
intermediário onde o defeito vive. Teste de campo controlado que dispara
um evento com o valor final não testa digitação: testa colagem.

# Aplicação futura

Ao escrever ou revisar transformação aplicada em `onChange` de campo
controlado, verifique se ela é idempotente sobre prefixos do texto
final. `trim`, colapso de espaços (`\s+` → `" "`), `toUpperCase` em
posição fixa e máscaras que reposicionam o cursor são os casos que
quebram. Se não for, mova-a para o `submit`, para o `onBlur` ou para a
action que persiste.

Ao testar entrada de texto, use `userEvent.type` — não
`fireEvent.change` com o valor completo. Onde o componente é controlado
pelo pai, o teste precisa reencaminhar o estado (`rerender` com o valor
novo), senão ele verifica só a primeira tecla.

Quando o usuário relatar "não consigo editar", reproduza **digitando**
antes de ler o código: o sintoma distingue na hora entre campo inerte
(handler ausente), valor que volta atrás (estado no pai) e caractere
específico que some (normalização no caminho).

# Evidência

Reprodução, com `userEvent.type` e o estado reencaminhado ao
componente:[^relato]

```
VALOR NA TELA: "Cocacolazero"
DESCRICAO:     "Cocacolazero 250 g"
AssertionError: expected 'Cocacolazero' to be 'Coca cola zero'
```

Os dois testes de regressão adicionados (um no domínio, um no
componente) foram verificados nos dois sentidos — reintroduzido o
`trim`, ambos falham:

```
× preserva o espaço em digitação, que é estado intermível e não texto final
× aceita nome composto digitado tecla a tecla
Tests  2 failed | 99 passed (101)
```

Restaurada a correção, 101/101. O teste antigo com `fireEvent.change`
permanece verde nas duas versões, que é exatamente o motivo de o bug ter
chegado à produção.[^teste-cego]

[^renomear]: `src/domain/alimentos/prato.ts`, função `renomearItem`.
[^teste-cego]: `src/components/diario/__tests__/registro-retroativo.unit.test.tsx`, caso "corrigir o alimento preserva os macros".
[^relato]: Sessão de 2026-08-30.
