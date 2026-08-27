---
type: Development Learning
title: "defaultValue conserva o DOM quando a key ignora a identidade do domínio"
description: "Campos não controlados reaproveitados com a mesma key mantêm o valor visual do item anterior; a key precisa representar a identidade completa e o rascunho precisa de estado próprio."
tags: [react, formularios, key, nextjs, e2e, diagnostico]
status: stable
generated:
  by: agente/gpt-5.6-sol
  at: 2026-08-27T14:23:13-03:00
sources:
  - id: referencia-serie
    resource: "src/app/(app)/sessao/[id]/page.tsx, src/components/sessao/registro-serie.tsx"
    title: "Correção da referência histórica por exercício e série"
  - id: e2e-navegacao-serie
    resource: "e2e/sessao.e2e.test.ts — cada Exercício da Sessão exibe sua própria Referência da Série"
    title: "Regressão reproduzida e validada por navegação real"
---

# Contexto

Na Sessão de Treino, navegar do exercício 2 para o 3 mantinha carga, repetições e RIR do exercício anterior, apesar de o servidor devolver no HTML os valores corretos do exercício 3. Cada lista usava `serie.numero` como `key`; como ambos os exercícios tinham série 1, 2 e 3, o React preservava os mesmos componentes. Os inputs eram não controlados e recebiam `defaultValue`, aplicado somente na montagem.

# Aprendizado

`defaultValue` não é sincronização de props: ele inicializa o controle e depois o DOM preserva o valor. Se a `key` representa apenas a posição (`1`, `2`, `3`) e não a entidade completa, o React considera itens de domínios diferentes como o mesmo componente e o valor visual sobrevive à troca.

Trocar a `key` pela identidade completa corrige o vazamento, mas também desmonta o formulário e descarta digitação não confirmada. Quando o produto exige rascunho, são duas responsabilidades distintas: a `key` impede compartilhar DOM entre entidades, enquanto um estado efêmero explicitamente indexado pela identidade restaura somente o rascunho correto.

# Aplicação futura

Ao renderizar formulários alternados por aba, query string, carrossel ou posição:

1. componha a `key` com todas as dimensões que identificam o registro, como sessão, entidade e número;
2. não espere que alterar `defaultValue` atualize um input já montado;
3. se a digitação deve sobreviver à navegação, modele um rascunho separado e indexado pela mesma identidade;
4. feche o teste navegando de A para B e voltando para A, usando valores distintos que revelem qualquer reaproveitamento indevido;
5. inspecione valor de propriedade do input no navegador, não apenas o atributo HTML: o atributo pode mostrar a nova referência enquanto a propriedade visível ainda contém o valor antigo.

# Evidência

No teste vermelho, o locator resolvia um `<input value="70">` vindo do novo HTML, mas `toHaveValue` recebia `"40"`: o atributo estava correto e a propriedade viva do DOM continuava errada. Incluir exercício e sessão na `key` fez B exibir sua própria referência; adicionar o rascunho efêmero fez A recuperar somente sua digitação ao voltar, e o recarregamento restaurar o histórico.[^e2e-navegacao-serie]

[^e2e-navegacao-serie]: Fonte `e2e-navegacao-serie`.
