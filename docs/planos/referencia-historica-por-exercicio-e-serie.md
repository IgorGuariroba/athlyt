# Plano de implementação — Referência histórica por exercício e série

Status: implementado
Especificação: [`specs/referencia-historica-por-exercicio-e-serie.md`](../../specs/referencia-historica-por-exercicio-e-serie.md)

## 1. Objetivo

Corrigir a Sessão de Treino para que carga, repetições e RIR sejam preenchidos pelo último registro confirmado do mesmo exercício e do mesmo número de série, sem transportar valores do exercício anteriormente exibido.

A entrega também deve manter rascunhos isolados durante a navegação da sessão, aceitar séries registradas em sessões abandonadas e preservar a prescrição atual como meta separada do histórico.

## 2. Diagnóstico do código atual

### 2.1 Vazamento visual entre exercícios

Em `src/app/(app)/sessao/[id]/page.tsx`, os componentes `RegistroSerie` usam somente `serie.numero` como `key`. Exercícios diferentes normalmente repetem os números 1, 2 e 3, então o React reutiliza a mesma instância ao navegar.

Em `src/components/sessao/registro-serie.tsx`, os campos são não controlados e usam `defaultValue`. Esse valor só é aplicado na montagem; ao trocar de exercício sem trocar a identidade React do componente, o DOM conserva carga, repetições e RIR do exercício anterior.

### 2.2 Histórico parcialmente correto

`ultimasSeriesDoHistorico`, em `src/domain/sessao/repositorio.ts`, já usa a chave `exercicioId:numero`, percorre sessões da mais recente para a mais antiga e mantém o primeiro registro encontrado. Portanto, já existem:

- separação por exercício exato;
- separação por número da série;
- fallback independente para uma execução mais antiga quando uma série não existe na execução mais recente.

As lacunas são:

- consulta apenas sessões `concluida`, ignorando séries válidas de sessões `abandonada`;
- carrega apenas `cargaKg` e `repeticoes`, ignorando o RIR registrado;
- o campo `rir` mistura referência editável e meta prescrita.

### 2.3 Caminhos de substituição

Exercícios substitutos são montados por `trocarNoExercicio` e `dividirNaSubstituicao`. Hoje eles recebem somente a melhor carga histórica, não os últimos valores por série. Esses caminhos também precisam respeitar a identidade exata do exercício substituto.

### 2.4 Descanso

`AjusteDescanso` e `store-descanso.ts` formam um fluxo separado. Esta entrega não deve derivar descanso das séries históricas nem alterar o seletor existente; as opções continuam calculadas a partir da prescrição vigente.

## 3. Estratégia

Implementar em três fatias:

1. completar o modelo histórico no domínio;
2. separar RIR histórico de RIR prescrito;
3. corrigir a identidade dos formulários e adicionar rascunho efêmero por sessão, exercício e série.

Não é necessária migração de banco: as sessões armazenam snapshots JSON e o novo campo de prescrição pode ser opcional para compatibilidade com snapshots antigos.

## 4. Passos de implementação

### Passo 1 — Fixar o contrato histórico com testes de integração

**Editar:** `src/domain/sessao/__tests__/jornada.int.test.ts`

Adicionar testes inicialmente falhos para provar:

1. a próxima sessão do mesmo exercício recebe carga, repetições e RIR da série de mesmo número;
2. uma série registrada em sessão abandonada é usada como referência;
3. cada número de série busca seu próprio registro mais recente: séries 1 e 2 podem vir da sessão mais recente e a série 3 de uma sessão anterior;
4. exercício sem histórico mantém carga vazia e usa repetições/RIR prescritos;
5. exercícios diferentes não compartilham valores.

Usar as APIs públicas `iniciarSessao`, `registrarSerie`, `concluirSessao` e `abandonarSessao`, evitando montar snapshots artificiais quando a jornada pública consegue expressar o cenário.

### Passo 2 — Completar a consulta do histórico

**Editar:** `src/domain/sessao/repositorio.ts`

Alterações:

- ampliar `UltimaSerie` para incluir `rir`;
- consultar sessões encerradas nos estados `concluida` e `abandonada`, excluindo `em_andamento`;
- continuar ordenando por `startedAt` decrescente;
- continuar preenchendo a `Map` apenas na primeira ocorrência de cada chave `exercicioId:numero`;
- em `planejarExercicios`, preencher `cargaKg`, `cargaSugeridaKg`, `repeticoes` e `rir` a partir de `UltimaSerie`;
- quando não houver histórico, manter carga vazia, repetições sem registro e RIR prescrito.

Não alterar `marcasDoHistorico` nesta entrega: recordes e melhor marca possuem contrato próprio. A inclusão de sessões abandonadas aqui vale para a Referência da Série, conforme a especificação.

### Passo 3 — Separar RIR prescrito de RIR registrado

**Editar:**

- `src/domain/sessao/repositorio.ts`
- `src/domain/sessao/coach-local.ts`
- `src/app/(app)/sessao/[id]/page.tsx`
- testes que constroem `SerieSessao` diretamente

Adicionar a `SerieSessao`:

```ts
rirPrescrito?: number;
```

Regras:

- novas sessões congelam `rirPrescrito: exercicio.rir`;
- `rir` continua sendo o valor editável e, após confirmação, o valor efetivamente realizado;
- snapshots antigos usam `serie.rir` como fallback quando `rirPrescrito` estiver ausente;
- o cabeçalho da tela mostra `rirPrescrito ?? rir` como meta;
- o Coach Local compara a série anterior com `proximaSerie.rirPrescrito ?? proximaSerie.rir`, e não com o RIR histórico pré-preenchido;
- cautela, resumo, recordes, sincronização e Copiloto continuam lendo `serie.rir` das séries concluídas como valor realizado.

Em `RegistroSerie`, separar as props hoje confladas:

- `rirInicial`: referência histórica editável;
- `rirSugerido`: meta prescrita.

O campo começa com `rirInicial`; a informação de prescrição continua disponível separadamente na tela.

### Passo 4 — Aplicar referência histórica aos exercícios substitutos

**Editar:**

- `src/domain/sessao/repositorio.ts`
- `src/domain/sessao/__tests__/substituicao.int.test.ts`

Alterações:

- disponibilizar `ultimasSeries` aos caminhos `aplicarSubstituicoesPersistentes`, `trocarNoExercicio` e `dividirNaSubstituicao`;
- para cada série ainda não concluída do substituto, buscar carga, repetições e RIR pela identidade do exercício novo e pelo número da série;
- manter séries já realizadas vinculadas ao exercício original;
- preservar `rirPrescrito`, repetições sugeridas e descanso do estímulo originalmente prescrito;
- quando o substituto não tiver histórico, usar os fallbacks de Primeira Execução.

Adicionar testes para substituição persistente e substituição durante a sessão, garantindo que o substituto use somente seu próprio histórico.

### Passo 5 — Criar store efêmero de rascunhos

**Novo:** `src/lib/store-rascunho-serie.ts`

Conforme os seams públicos confirmados para o TDD, o store não recebe teste direto de implementação: seu contrato é verificado pela navegação real em `/sessao/[id]`.

O store deve existir apenas em memória e usar chave composta por:

```text
sessionId + exercicioId + numero
```

Guardar os valores como texto para preservar estados intermediários legítimos de digitação, inclusive campo temporariamente vazio:

```ts
interface RascunhoSerie {
  cargaKg?: string;
  repeticoes?: string;
  rir?: string;
}
```

Contrato mínimo:

- ler/assinar snapshot estável;
- atualizar um campo sem apagar os demais;
- remover o rascunho de uma série após confirmação local bem-sucedida;
- reiniciar o store em testes;
- snapshot de servidor vazio.

Não usar `localStorage`, `sessionStorage` ou IndexedDB. Assim, o rascunho sobrevive à navegação cliente, mas desaparece naturalmente ao fechar ou recarregar a página. Seguir o padrão de assinatura com `useSyncExternalStore` já documentado em `docs/memory/estado-offline-fora-do-react.md`.

O cenário E2E deve comprovar o isolamento entre exercícios e o descarte no recarregamento. A chave composta também separa séries e sessões sem expor essa estrutura como seam de teste.

### Passo 6 — Integrar rascunhos e corrigir identidade React

Antes de editar `src/app/`, executar `ui_catalogo` conforme `AGENTS.md` e confirmar que nenhum componente novo é necessário.

**Editar:**

- `src/components/sessao/registro-serie.tsx`
- `src/components/sessao/registro-serie.stories.tsx`
- `src/app/(app)/sessao/[id]/page.tsx`
- `src/app/(app)/sessao/[id]/__tests__/registro-serie.unit.test.tsx`

Alterações:

1. passar `sessionId` para `RegistroSerie`;
2. usar uma identidade inequívoca no mapeamento:

```tsx
key={`${sessao.id}:${exercicio.exercicioId}:${serie.numero}`}
```

3. iniciar cada campo pelo rascunho da chave exata, quando existir; caso contrário, usar a referência histórica ou a prescrição aplicável;
4. atualizar o rascunho no `onChange` de carga, repetições e RIR;
5. após `enfileirarEvento` resolver, remover o rascunho daquela série;
6. se a persistência local falhar, conservar o rascunho para nova tentativa;
7. valores de `registrosLocais` do outbox continuam tendo precedência para séries já confirmadas localmente.

Manter os controles, layout e tokens existentes; não há mudança visual nem componente novo.

Nos testes unitários, cobrir:

- troca de props entre dois exercícios com séries de mesmo número não reaproveita valores do DOM;
- navegar de volta restaura o rascunho do exercício original;
- confirmar limpa o rascunho;
- falha ao enfileirar conserva o rascunho;
- RIR histórico inicia o campo, enquanto RIR prescrito continua sendo uma prop separada.

Atualizar a story apenas para o novo contrato de props e garantir que continue renderizando.

### Passo 7 — Regressão E2E da jornada real

**Editar:** `e2e/sessao.e2e.test.ts`
**Se necessário, editar:** `e2e/helpers/sessao.ts`

Criar um plano de teste com pelo menos dois exercícios e históricos distintos. Validar no navegador:

1. abrir o exercício 2, registrar ou editar valores;
2. navegar para o exercício 3 e confirmar que carga, repetições e RIR pertencem ao exercício 3;
3. digitar um rascunho no exercício 3 sem confirmar;
4. navegar para outro exercício e voltar, confirmando que o rascunho reaparece somente no exercício 3;
5. recarregar a página e confirmar que o rascunho desaparece, voltando à referência histórica;
6. confirmar que a meta prescrita de RIR permanece visível quando difere do histórico.

Usar a skill `playwright-cli` para a validação web e salvar vídeo/evidências em `/home/movida/Downloads/evidencias-e2e/`, com nomes descritivos e sem versioná-los.

## 5. Arquivos afetados

### Novos

```text
src/lib/store-rascunho-serie.ts
docs/planos/referencia-historica-por-exercicio-e-serie.md
```

### Editados

```text
src/domain/sessao/repositorio.ts
src/domain/sessao/coach-local.ts
src/domain/sessao/__tests__/jornada.int.test.ts
src/domain/sessao/__tests__/substituicao.int.test.ts
src/domain/sessao/__tests__/coach-local.unit.test.ts
src/components/sessao/registro-serie.tsx
src/components/sessao/registro-serie.stories.tsx
src/app/(app)/sessao/[id]/page.tsx
src/app/(app)/sessao/[id]/__tests__/registro-serie.unit.test.tsx
e2e/sessao.e2e.test.ts
```

Outros testes que constroem `SerieSessao` podem precisar somente de ajustes de fixture. Não há alteração prevista em `src/db/schema.ts`, migrations ou componentes de descanso.

## 6. Ordem recomendada

1. escrever os testes de integração do histórico;
2. corrigir `ultimasSeriesDoHistorico`;
3. introduzir `rirPrescrito` e ajustar Coach/UI;
4. cobrir os caminhos de substituição;
5. implementar o store efêmero e comprová-lo pela rota pública;
6. integrar o store ao formulário e corrigir as keys;
7. rodar regressão E2E em navegador real;
8. executar a verificação completa.

## 7. Verificação

Executar, nesta ordem:

```bash
npm run test:int -- src/domain/sessao/__tests__/jornada.int.test.ts
npm run test:int -- src/domain/sessao/__tests__/substituicao.int.test.ts
npm run test:unit -- 'src/app/(app)/sessao/[id]/__tests__/registro-serie.unit.test.tsx'
npm run test:unit -- src/domain/sessao/__tests__/coach-local.unit.test.ts
npm run storybook:verificar
npm run ui:verificar
npm run lint
npm run typecheck
npm run test
```

Depois, executar o cenário focado de Playwright para a Sessão de Treino e guardar as evidências fora do repositório.

## 8. Critérios de conclusão

A entrega está concluída quando:

- navegar entre exercícios nunca mistura carga, repetições ou RIR;
- cada série usa o registro mais recente do mesmo exercício e número;
- sessões abandonadas fornecem referências válidas;
- exercícios substitutos usam seu próprio histórico;
- RIR histórico não substitui a meta prescrita no cabeçalho nem no Coach;
- rascunhos ficam isolados, sobrevivem à navegação e somem no recarregamento;
- descanso permanece fora do histórico desta correção;
- testes unitários, integração, governança de UI, Storybook, lint, tipos e E2E passam.

## 9. Riscos e cuidados

- Não corrigir apenas a `key`: isso elimina o vazamento, mas descarta o rascunho ao navegar e deixa RIR/sessões abandonadas incorretos.
- Não sobrescrever `rir` com a prescrição ao montar a sessão: isso perderia a referência histórica pedida pelo atleta.
- Não usar o RIR histórico como alvo do Coach; a meta é `rirPrescrito`.
- Não persistir rascunho no armazenamento do navegador; a especificação exige descarte no reload.
- Não ampliar silenciosamente a regra de recordes para sessões abandonadas; isso merece requisito próprio.
- Não alterar o fluxo de descanso: a seleção existente continua derivada da prescrição vigente.
