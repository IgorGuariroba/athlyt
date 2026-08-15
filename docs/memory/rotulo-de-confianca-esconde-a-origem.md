---
type: Development Learning
title: "Um único mapa de confiança faz estimativa de IA aparecer como valor de tabela"
description: "ROTULO_CONFIANCA descreve a fonte ponderada; reusá-lo para itens estimados por foto exibia 'Valor de tabela analítica' sobre um palpite do modelo."
tags: [ui, ia, proveniencia, nutricao, auditoria]
status: stable
generated:
  by: agente/claude-opus-4-6
  at: 2026-08-15T12:15:00-03:00
sources:
  - id: sessao-registro-por-foto
    resource: "src/domain/alimentos/proveniencia.ts, src/app/(app)/diario/registrar/foto/estimativa.tsx, evidencias-e2e/registro-foto-estimativa.png"
    title: "Registro de refeição por foto — revisão visual da tela de estimativa"
---

# Contexto

Ao construir o registro de refeição por foto, os itens estimados pelo modelo reusaram `ROTULO_CONFIANCA`, o mesmo mapa que a busca na base nutricional usa. O código passa no type check e nos testes: `Confianca` é o mesmo tipo nos dois casos.

A captura de tela do fluxo mostrou o resultado real: o item "Peito de frango grelhado", que o modelo apenas reconheceu numa foto, aparecia rotulado **"Valor de tabela analítica"**.[^sessao-registro-por-foto]

# Aprendizado

`ROTULO_CONFIANCA` não é uma escala de certeza — é a leitura da **fonte eleita** pela ponderação de `proveniencia.ts`. `alta` ali significa "tabela analítica venceu as fontes concorrentes". Aplicado a uma estimativa de IA, `alta` significa outra coisa: "o modelo está seguro do que viu", que continua sendo um palpite sobre a porção.

Compartilhar o tipo `Confianca` entre origens diferentes é correto; compartilhar o **rótulo** não é, e a falha é invisível ao compilador porque as duas escalas têm a mesma forma. O sintoma só aparece renderizado — é a mesma lição de `auditoria-visual-por-screenshot.md`, agora em texto e não em layout.

A consequência é a que a user story 59 proíbe explicitamente: estimativa se passando por medição, no ponto exato em que o atleta decide se confia no número.

# Aplicação futura

Ao exibir confiança de um valor, derive o rótulo de **(confiança, origem)** e nunca só da confiança:

```ts
rotuloDeConfianca(item.confianca, item.origemDado)
```

Toda origem nova em `OrigemDado` exige decidir seu vocabulário antes de reusar o de outra. Duas verificações baratas fecham o ciclo:

- renderize a tela e leia os rótulos como um usuário leria — o defeito não aparece em diff nem em teste de tipo;
- para dado de IA, confirme que nenhum rótulo possível contém a palavra "tabela", "medido" ou equivalente. É uma asserção de uma linha (`src/domain/alimentos/__tests__/rotulo-confianca.unit.test.ts`).

# Evidência

Antes da correção, o item estimado pela foto com `confianca: "alta"` renderizava "Valor de tabela analítica"; depois, "Estimativa — alimento e porção claros na foto". A entrada manual do atleta, que também consumia o mapa, precisou de rótulo próprio ("Estimativa sua — informada por você") para manter os E2E de Atalhos de Registro que verificam a marca de estimativa exigida pela user story 59.[^sessao-registro-por-foto]

[^sessao-registro-por-foto]: Consulte `sources` com id `sessao-registro-por-foto`.
