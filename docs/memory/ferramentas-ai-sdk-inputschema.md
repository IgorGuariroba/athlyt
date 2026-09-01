---
type: Development Learning
title: "Ferramentas de Leitura do AI SDK usam inputSchema e não aplicam default fora do SDK"
description: "O executor de decisões (decidir.ts) já aceitava ferramentas, mas é preciso usar inputSchema (não parameters) e não confiar no default do zod ao chamar execute diretamente."
tags: [ia, ai-sdk, ferramentas, tool-calling, adr-0006, schemas]
status: stable
generated:
  by: "agente/pi v1 (sessão de implementação da ferramenta ExerciseDB)"
  at: "2026-08-20T19:40:00-03:00"
sources:
  - id: "sessao-2026-08-20"
    resource: "src/domain/ia/ferramentas/consultar-exercicio.ts"
    title: "Implementação da primeira Ferramenta de Leitura do agent de plano"
---

# Contexto

O executor de decisões de IA (`src/domain/ia/decidir.ts`) documentava suporte a
"Ferramentas de Leitura" (campo `ferramentas?: ToolSet` e `stopWhen:
stepCountIs(...)`), mas **nenhuma operação preenchia esse campo**. Ao dar ao
agent de planejamento a ferramenta para consultar a ExerciseDB, descobriu-se que
a API concreta de criação da tool tem duas armadilhas que o TypeScript expõe
como erros de overload, não como mensagens claras.

# Aprendizado

1. **O campo é `inputSchema`, não `parameters`.** O `tool()` do AI SDK v7
   (`@ai-sdk/provider-utils`) tipa a entrada via `BaseTool.inputSchema:
   FlexibleSchema<INPUT>`. Usar `parameters:` (padrão das versões antigas / de
   exemplos online) cai num erro de overload do tipo "X is not assignable to
   type 'undefined'" que parece apontar para o `execute`.

2. **`execute` e `inputSchema` pertencem a overloads diferentes.** O arranjo
   que compila é `tool({ inputSchema: z.object(...), execute: async ({...}) =>
   ... })`. Sem `execute` o TypeScript escolhe o overload de tool sem execução
   e rejeita a função fornecida.

3. **`dynamicTool()` não aceita `execute`/`inputSchema` da mesma forma** e
   força `INPUT=unknown`; para ferramenta com schema e execução no Athlyt,
   use `tool()`.

4. **Chamar `execute(...)` direto não aplica o `default()` do zod.** O default
   é resolvido pelo SDK ao parsear a chamada; ao testar o `execute` sem passar
   pelo SDK, o campo opcional chega `undefined`. Trate o fallback dentro do
   `execute` (ex.: `limite ?? 3`) em vez de depender do default do schema.

# Aplicação futura

Ao criar a primeira Ferramenta de Leitura de uma operação:
- comece por `tool({ inputSchema, execute })` — não copie exemplos com
  `parameters:`;
- escreva o teste do `execute` passando também o segundo argumento de opções
  (`{ toolCallId: "x" } as never`), porque `execute` é tipado com dois args;
- se o `inputSchema` tiver `default()`, não confie nele em teste direto do
  `execute` — adicione um fallback explícito dentro da função.
- o `onStepFinish` de `decidir.ts` já grava em `ferramentasConsultadas` da
  Trilha de Decisão; nenhum código extra é preciso para auditar chamadas.

# Evidência

`src/domain/ia/ferramentas/consultar-exercicio.ts` compila com `npx tsc
--noEmit` e tem 2 testes unitários passando em
`src/domain/ia/ferramentas/__tests__/consultar-exercicio.unit.test.ts`.
O `exercicioSchema` de `plano-inicial.ts` ganhou `comoExecutar?: string` e
`gerarPlanoInicialComIA` passou a enviar `ferramentas: { consultarExercicio }`.
O teste de `plano-inicial.unit.test.ts` agora assere que a tool é enviada.
Fonte: sessão de 2026-08-20.
