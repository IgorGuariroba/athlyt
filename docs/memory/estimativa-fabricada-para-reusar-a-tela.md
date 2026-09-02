---
type: Development Learning
title: "Reusar a tela de revisão para dado já gravado fabrica proveniência que ninguém produziu"
description: "Para reaproveitar a revisão na edição de um consumo, a tela forjava uma estimativa com confiança fixa — e passou a exibir um aviso de incerteza sobre porções que o modelo havia estimado da foto."
tags: [ui, ia, proveniencia, nutricao, auditoria, react]
status: stable
generated:
  by: agente/claude-opus-4-6
  at: 2026-09-02T09:30:00-03:00
sources:
  - id: sessao-acrescimo-por-estimativa
    resource: "src/components/diario/registro-por-descricao.tsx, src/components/diario/revisao-estimativa.tsx, commit 24c318c"
    title: "Acréscimo de alimento por estimativa — remoção da tarja fabricada"
---

# Contexto

`RevisaoEstimativa` exige `confianca` e `limitacoes` do **conjunto** para desenhar a tarja de incerteza que precede a lista. O contrato faz sentido no fluxo que a originou: ali houve uma estimativa, e ela tem uma confiança a declarar.

Ao editar um Consumo Real já gravado, a mesma tela é reaproveitada — só que não houve estimativa nova. Para satisfazer o tipo, a tela montava um objeto com os campos preenchidos à mão:

```ts
const estimativaExistente = itensIniciais.length
  ? { …, confianca: "baixa", descricaoUsada: "Consumo registrado anteriormente" }
  : null;
```

O resultado renderizado foi o usuário quem reportou: ao abrir "editar" num café da manhã **registrado por foto**, a tela anunciava *"Estimativa — porção não informada, assumida como usual"*. A porção tinha sido estimada da foto; o aviso descrevia uma incerteza que não era aquela, derivada de um `"baixa"` que nenhum modelo produziu.[^sessao-acrescimo-por-estimativa]

# Aprendizado

Um campo obrigatório num componente de apresentação **força quem não tem o dado a inventá-lo**. O tipo fica satisfeito, o compilador silencia, e o valor forjado é indistinguível de um valor real no ponto em que é lido.

É o mesmo defeito de `rotulo-de-confianca-esconde-a-origem.md`, na direção oposta: lá um rótulo verdadeiro foi aplicado à origem errada; aqui um dado de origem nenhuma ganhou rótulo. Nos dois casos a falha é invisível em diff, em type check e em teste de tipo — e só aparece renderizada, para quem lê a tela como usuário.

A distinção que o modelo precisa carregar não é "qual a confiança", mas **"houve estimativa?"**. Quando a resposta pode ser não, o campo é opcional, e a ausência é o próprio significado: sem estimativa de conjunto, não há tarja de conjunto a exibir.

Atenção ao que **não** deve sumir junto: a marca por item (`rotuloDeConfianca(item.confianca, item.origemDado, …)`) vem do item, não da tela, e é ela que impede a estimativa de ser lida como medição depois de gravada. Remover a tarja fabricada e a marca por item parecem a mesma simplificação e não são.

# Aplicação futura

Ao reusar um componente de revisão/estimativa para exibir dado que já existe:

- Se um campo obrigatório precisar de valor literal para o reuso compilar, **esse é o sinal**. Torne-o opcional e trate a ausência, em vez de preencher com um default plausível.
- Prefira modelar a ausência a modelar um valor neutro: `confianca?: Confianca` diz "pode não ter havido estimativa"; `confianca: "baixa"` afirma que houve uma, e ruim.
- Distinga proveniência **do conjunto** (nasce da captura) de proveniência **do item** (viaja com o dado gravado). A primeira desaparece no reuso; a segunda nunca.
- Abra a tela e leia os avisos como o usuário leria. Nenhum teste desta base pegou o defeito — foi um relato com captura de tela.

# Evidência

A tarja aparecia ao abrir `/diario/registrar/descricao?consumo=<id>` para um consumo registrado por foto, exibindo "porção não informada, assumida como usual" sobre itens cuja porção o modelo estimou. `confianca` passou a ser opcional em `RevisaoEstimativa` e a tela deixou de forjar o objeto; a marca por item permaneceu, coberta por `registro-retroativo.unit.test.tsx` ("sem estimativa de conjunto, não inventa tarja de incerteza") e pelos E2E que exigem a marca de estimativa da user story 59.[^sessao-acrescimo-por-estimativa]

[^sessao-acrescimo-por-estimativa]: Consulte `sources` com id `sessao-acrescimo-por-estimativa`.
