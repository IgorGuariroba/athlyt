---
type: Development Learning
title: "Estado que vive fora do React deve ser assinado, não espelhado"
description: "Espelhar IndexedDB e navigator.onLine em useState+useEffect quebra o lint de hooks e cria janelas em que a UI afirma o oposto do estado real; useSyncExternalStore é a forma correta."
tags: [react, offline, indexeddb, hooks, eslint, outbox]
status: stable
generated:
  by: agente/claude-opus-4-6
  at: 2026-08-01T17:00:00-03:00
sources:
  - id: issue-21-outbox
    resource: "src/lib/store-outbox.ts, src/lib/use-online.ts, src/app/(app)/sessao/[id]/estado-conexao.tsx"
    title: "Implementação do outbox offline da Sessão de Treino (issue #21)"
  - id: lint-set-state-in-effect
    resource: "npm run lint — react-hooks/set-state-in-effect"
    title: "Erro de lint ao espelhar fonte externa em useState"
---

# Contexto

O outbox offline precisa exibir duas informações que não pertencem ao React: a fila de eventos em IndexedDB e a conectividade do aparelho. A primeira tentativa foi a óbvia — `useState` + `useEffect` lendo a fonte no mount e assinando eventos de `window`.

O `react-hooks/set-state-in-effect` rejeitou o padrão, e três reescritas sucessivas dentro do mesmo modelo (mover o `setState`, trocar dependências, ler antes de setar) não o satisfizeram.[^lint-set-state-in-effect] O lint estava certo pela razão de fundo, não pela forma: o estado não era do componente.

# Aprendizado

Quando a fonte da verdade vive fora do React — IndexedDB, `navigator.onLine`, um store de módulo compartilhado entre abas — espelhá-la em `useState` cria uma janela real entre o primeiro render e o efeito, na qual o componente afirma algo que já não é verdade. Num badge de conexão isso é exatamente o pior caso: ele diz "Online, 0 na fila" no instante em que o usuário o consulta justamente por desconfiar.

`useSyncExternalStore` elimina a janela porque o React lê a fonte durante o render. Duas exigências não negociáveis: o snapshot precisa ser **estável entre notificações** (retornar objeto novo a cada leitura causa loop infinito) e é preciso um snapshot de servidor separado — na SSR a fila local é, por definição, desconhecida.

Corolário de arquitetura: um store de módulo com `assinar`/`ler`/mutações mantém a lógica offline testável e fora dos componentes, e o React vira apenas uma view assinante.

# Aplicação futura

Antes de escrever `useState` + `useEffect` para refletir algo, pergunte de quem é o estado. Se a resposta não for "deste componente", use `useSyncExternalStore` com um store dedicado:

```ts
// store: fonte da verdade + notificação
let estado = VAZIO;               // snapshot estável
const assinantes = new Set<() => void>();
function definir(m: Partial<Estado>) { estado = { ...estado, ...m }; assinantes.forEach((f) => f()); }

// componente
const dados = useSyncExternalStore(assinar, ler, lerNoServidor);
```

Ao ver `react-hooks/set-state-in-effect` repetidamente, trate como sinal de modelo errado, não como regra a contornar.

# Evidência

`src/lib/use-online.ts` e `src/lib/store-outbox.ts` implementam o padrão; `estado-conexao.tsx` e `fila-local.tsx` consomem os dois stores e passaram no lint sem supressão.[^issue-21-outbox] A jornada E2E `e2e/offline.e2e.test.ts` verifica o badge em todas as transições de rede.

[^lint-set-state-in-effect]: O erro persistiu por três reescritas dentro do modelo de espelhamento e desapareceu na primeira versão com `useSyncExternalStore`.
[^issue-21-outbox]: Issue #21 — Outbox offline da Sessão de Treino e Coach Local.
