# Mídia de Execução

Guia operacional da Mídia de Execução (`CONTEXT.md`). Decisão
arquitetural completa em `docs/adr/0001-midia-de-execucao-licenciada.md`.

## Origem dos dados

[ExerciseDB / AscendAPI](https://docs.ascendapi.com), tier V1 OSS
gratuito, sem autenticação:

```
GET https://oss.exercisedb.dev/api/v1/exercises/search?search={termo}&limit={n}
GET https://oss.exercisedb.dev/api/v1/exercises/{exerciseId}
```

O cliente fica em `src/infra/exercisedb/index.ts`. `EXERCISEDB_BASE_URL`
(`.env.example`) permite apontar para outro host — um mock em teste, ou
o host RapidAPI do tier V2 pago no futuro.

**Armadilha conhecida**: a busca usa o parâmetro `search`, não `q`.
`?q=` é aceito silenciosamente e devolve `data: []`, sem erro.

## Licenciamento

Verificar antes de espelhar em produção — ver seção "Licenciamento" da
ADR 0001. Enquanto pendente, `scripts/importar-midia-exercicios.ts
--espelhar` não deve ser rodado contra o bucket de produção.

## Como a mídia chega à tela

```
scripts/importar-midia-exercicios.ts --espelhar
  → baixa o GIF de static.exercisedb.dev
  → grava em R2: midia-execucao/{exercicioId}.gif

FichaExercicio (componente de tela)
  → recebe midiaUrl="/api/midia-execucao/{exercicioId}" (ou undefined)
  → <img src={midiaUrl} ... onError={cai para o fallback} />

/api/midia-execucao/[exercicioId]/route.ts
  → autentica a sessão
  → midiaDoExercicio(id) → 404 se não mapeado
  → storage.ler(chaveObjeto) → 404 se R2 ausente ou objeto inexistente
  → 200 com o GIF, cache-control longo
```

O service worker (`src/app/sw.ts`) cacheia `/api/midia-execucao/*` com
`CacheFirst` — a chave é estável e o conteúdo imutável, então a
animação continua disponível offline depois da primeira visita ao
exercício.

## O mapa de mídia é curado, não automático

`src/domain/plano/midia-execucao.ts` liga cada id do catálogo Athlyt
(`src/domain/plano/exercicios.ts`) a um `exerciseId` da ExerciseDB.
**Curadoria manual**: um nome parecido pode ser um movimento diferente,
e a tela ensinaria a execução errada durante a série — pior do que
nenhuma animação.

Fluxo para adicionar/revisar um exercício:

1. `npm run midia:importar -- --sugerir` lista candidatos por busca
   para cada id do catálogo sem mapeamento (nome, equipamentos, id).
2. Compare manualmente nome, padrão de movimento e equipamento contra
   `src/domain/plano/exercicios.ts`.
3. Adicione a entrada em `MIDIA_EXECUCAO` (`midia-execucao.ts`).
4. Rode `npm run test:unit -- src/domain/plano/__tests__/midia-execucao.unit.test.ts`
   para confirmar a invariante (toda chave existe no catálogo).
5. Depois de confirmado o licenciamento (ADR 0001), rode
   `npm run midia:importar -- --espelhar` para gravar o GIF no R2.

Exercício sem entrada no mapa é um estado válido: a ficha usa o
fallback em texto (`comoExecutar`) e o diagrama de músculos-alvo.

## Comportamento sem R2 configurado

A rota `/api/midia-execucao/[exercicioId]` devolve 404 sempre que
`configuracaoR2()` não resolve (variáveis `R2_*` ausentes) — falha
fechada, nunca 500. `FichaExercicio` trata a falta de `midiaUrl` (ou o
`onError` da imagem) caindo para `DiagramaMuscular` + texto. É o
caminho normal em desenvolvimento local sem R2 e no CI.
