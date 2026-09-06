---
type: Development Learning
title: "Autofix de no-unnecessary-type-assertion remove cast que o teste precisava"
description: "O autofix do ESLint apaga `as HTMLInputElement` de queries do Testing Library porque o type checker os vê como redundantes no ponto de chamada — e o teste quebra em `.checked` / `.value`."
tags: [eslint, typescript, testing-library, vitest, lint, refatoracao]
status: stable
generated:
  by: agente/pi (claude-opus-4-6)
  at: 2026-09-05T17:05:00-03:00
sources:
  - id: commit-lote7
    resource: "commit f185a16 (lint/estilo-e-sintaxe)"
    title: "Lote 7 do saneamento de lint, onde o autofix removeu asserções de testes e o typecheck quebrou"
  - id: generics-testing-library
    resource: "node_modules/@testing-library/dom/dist/@types/queries.d.ts"
    title: "Assinatura genérica getByRole<T extends HTMLElement>(...): T"

---

# Contexto

No Lote 7 do saneamento da dívida de lint (regra `@typescript-eslint/no-unnecessary-type-assertion`, 19 ocorrências), `npx eslint --fix` removeu automaticamente casts como `(screen.getByRole("radio", ...) as HTMLInputElement).checked` em cinco arquivos de teste. O lint ficou verde, mas `tsc --noEmit` quebrou com `TS2339: Property 'checked' does not exist on type 'HTMLElement'` em quatro arquivos.

# Aprendizado

O cast é redundante **na leitura do type checker** porque o overload genérico de `getByRole` já devolve `HTMLElement`, e a asserção não estreita nada no ponto onde é aplicada — o `no-unnecessary-type-assertion` a remove sem verificar se a *propriedade acessada na sequência* existe. O remédio não é restaurar o cast (o lint volta a acusar), e sim usar o genérico da própria query, que informa o tipo concreto no retorno:

```tsx
// o autofix remove isto (asserção "desnecessária") e quebra o acesso a .checked:
(screen.getByRole("radio", { name: "90 dias" }) as HTMLInputElement).checked

// forma que lint e typecheck aceitam:
screen.getByRole<HTMLInputElement>("radio", { name: "90 dias" }).checked
```

O mesmo vale para `getByLabelText<HTMLTextAreaElement>` / `.value`. É um falso verde em duas camadas: o `--fix` reporta sucesso e o `lint` passa; só o `typecheck` denuncia. Nos lotes de lint que usam autofix, `npm run typecheck` precisa rodar logo após o `--fix`, não só no fim do lote.

# Aplicação futura

Ao rodar `eslint --fix` em lote (qualquer regra da família `no-unnecessary-*`), executar `npm run typecheck` imediatamente depois e revisar o diff dos arquivos de teste antes de continuar. Se um cast de query do Testing Library sumir, convertê-lo para genérico da query (`getByRole<HTMLInputElement>`, `getByLabelText<HTMLTextAreaElement>`) em vez de restaurar o cast.

# Evidência

No commit [`commit-lote7`], o autofix alterou `src/app/(app)/sessao/[id]/__tests__/ajuste-descanso.unit.test.tsx`, `src/components/diario/__tests__/acrescentar-alimento.unit.test.tsx`, `src/components/progresso/__tests__/seletor-horizonte.unit.test.tsx` e `src/components/tela/__tests__/tela.unit.test.tsx`; o `typecheck` seguinte reportou quatro `TS2339` em `.checked`/`.value`. A conversão para genéricos da query (ver [`generics-testing-library`]) zerou os erros com lint verde — resolução final presente no mesmo commit.
