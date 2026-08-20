# Plano de implementação — Mídia de Execução via ExerciseDB

Status: proposto · Alvo: agente implementador (Sonnet)
Conceito de domínio: **Mídia de Execução** (`CONTEXT.md`, seção Execução)

---

## 1. Por que este plano existe

Hoje a Mídia de Execução é **desenhada à mão dentro do código**: um SVG
de 676 linhas com esqueletos articulados (`IlustracaoExecucao`) mais uma
silhueta de blocos (`DiagramaMuscular`). Cada padrão de movimento novo
exige posar juntas manualmente em coordenadas. Isso não escala, não
ensina bem o movimento e já consumiu duas rodadas de revisão visual.

A ExerciseDB (hoje **AscendAPI**) entrega GIF/vídeo real de execução,
músculos-alvo, equipamentos e instruções passo a passo. Trocar a
animação artesanal por mídia licenciada elimina o trabalho de produção
visual e melhora o resultado.

O `CONTEXT.md` já prevê exatamente isso:

> **Mídia de Execução**: Animação/vídeo demonstrativo do exercício vindo
> de **banco aberto/licenciado hospedado em storage privado**, com
> fallback de instruções em texto e diagrama de músculos-alvo.

Ou seja: este plano **executa uma definição que já é do domínio**, não
introduz um conceito novo. Isso também fixa a arquitetura: a mídia é
**espelhada no R2**, não consumida direto do CDN em runtime.

---

## 2. Levantamento do que existe hoje

### 2.1 Arquivos da Mídia de Execução

| Arquivo | Linhas | Papel atual |
| --- | --- | --- |
| `src/components/tela/ficha-exercicio.tsx` | 100 | Sheet com ícone ⓘ ao lado do nome; hoje mostra `IlustracaoExecucao` + `DiagramaMuscular` + texto `comoExecutar` |
| `src/components/tela/ilustracao-execucao.tsx` | 676 | SVG artesanal: poses início/fim por `PadraoMovimento`, vista frontal/perfil, destaque do grupo |
| `src/components/tela/diagrama-muscular.tsx` | 153 | Silhueta com região marcada por `GrupoMuscular` |
| `src/components/tela/__tests__/ilustracao-execucao.unit.test.tsx` | — | Contrato do SVG |
| `src/components/tela/__tests__/diagrama-muscular.unit.test.tsx` | — | Contrato do SVG |
| `src/components/tela/__tests__/ficha-exercicio.unit.test.tsx` | — | Abre/fecha, conteúdo do dialog |
| `src/components/tela/index.ts` | — | Exporta os três |
| `src/app/design/page.tsx` (≈1020–1090) | — | Três `Amostra`: diagrama, ficha, ilustração |

### 2.2 Onde a ficha é consumida

- `src/app/(app)/sessao/[id]/page.tsx` (≈71–77) — único consumo real, no
  cabeçalho do exercício da Sessão de Treino.
- `src/app/design/page.tsx` — galeria.

### 2.3 Catálogo de exercícios

`src/domain/plano/exercicios.ts` (725 linhas): **32 exercícios** com id
estável (`supino-barra`, `agachamento-livre`, …), `padrao`,
`grupoPrimario`, `requer`, `comoExecutar`. Os ids atravessam o banco
(Plano Ativo imutável, `exercise_substitution`, `workout_session`).

**Consequência dura:** o catálogo do Athlyt continua sendo a fonte da
verdade da prescrição. A ExerciseDB entra apenas como **camada de
mídia**, ligada por um mapeamento explícito id-Athlyt → id-ExerciseDB.
Nada de trocar 32 exercícios curados por 11.000 sem curadoria.

### 2.4 Infra já disponível

- `src/infra/storage/index.ts` — `StoragePrivado` com
  `gravar/existe/ler/urlLeitura/excluir` sobre R2. Padrão de uso em
  `src/app/(app)/progresso/fotos/page.tsx`.
- `docs/storage-r2-tests.md` — variáveis `R2_*` e verificação real.
- `src/app/sw.ts` / `public/sw.js` — Serwist; `defaultCache` já tem
  regra para `gif|png|webp` (`static-image-assets`, 64 entradas) e
  `mp4|webm` (`static-video-assets`). Offline na academia é requisito.
- `next.config.ts` — **não tem `images.remotePatterns`**. Se a mídia for
  servida por rota própria same-origin (recomendado), não precisa mexer.

---

## 3. Fatos verificados da API (checados em 2026, não presuma)

A ExerciseDB foi renomeada para **AscendAPI**. Docs:
`https://docs.ascendapi.com/llms.txt`.

### 3.1 Tier gratuito (V1 OSS) — sem chave, verificado funcionando

```
GET https://oss.exercisedb.dev/api/v1/exercises?limit=10&search=bench
GET https://oss.exercisedb.dev/api/v1/exercises/{exerciseId}
GET https://oss.exercisedb.dev/api/v1/bodyparts | /muscles | /equipments
```

Resposta real de `GET /api/v1/exercises/EIeI8Vf`:

```json
{"success":true,"data":{
  "exerciseId":"EIeI8Vf",
  "name":"barbell bench press",
  "gifUrl":"https://static.exercisedb.dev/media/EIeI8Vf.gif",
  "targetMuscles":["pectorals"],
  "bodyParts":["chest"],
  "equipments":["barbell"],
  "secondaryMuscles":["triceps","shoulders"],
  "instructions":["Step:1 Lie flat on a bench...", "..."]
}}
```

Confirmados na coleta:
- 1.500 exercícios, GIF 180p, paginação por cursor
  (`meta.nextCursor`, `hasNextPage`).
- Busca é o parâmetro **`search`**, não `q` — `?q=` devolve `data: []`
  silenciosamente. Armadilha real.
- `GET https://static.exercisedb.dev/media/EIeI8Vf.gif` → `200`,
  ~124 KB, `image/gif`. Sem autenticação.
- Erro 404 traz `{"error":{"code":"NOT_FOUND", ...}}` — o envelope de
  erro **não** tem `success`.

### 3.2 Tier pago (V2, via RapidAPI)

- Host: `edb-with-videos-and-images-by-ascendapi.p.rapidapi.com`
- Headers: `X-RapidAPI-Key`, `X-RapidAPI-Host`.
- 11.000+ exercícios, `videoUrl` (MP4), `imageUrls` 360p–1080p,
  `exerciseTips`, `variations`, `relatedExerciseIds`.
- **Free tier do V2 é marca d'água.**

**Decisão para este plano:** implementar contra **V1 OSS gratuito**
(GIF, sem chave, sem marca d'água), com o cliente desenhado para que
trocar para V2 seja mudar de adaptador — não reescrever a UI.

### 3.3 Licenciamento — bloqueio obrigatório antes do merge

`CONTEXT.md` exige "banco aberto/licenciado". Antes de espelhar mídia no
R2, verifique os Terms of Use (`https://dub.sh/exercisedb-api-tos`) e
registre a conclusão numa ADR. Se a licença não permitir hospedagem
própria, o espelhamento no R2 cai e o plano passa a hotlink do CDN — o
que contradiz o `CONTEXT.md` e exige alterar o glossário.
**Não implemente o passo 5 antes de responder isso.**

---

## 4. O que será descartado, o que fica

### Descartado
- `src/components/tela/ilustracao-execucao.tsx` (676 linhas) e seu teste.
- Export `IlustracaoExecucao` / `legendaPadraoMovimento` em
  `src/components/tela/index.ts`.
- A `Amostra` "Ilustração de execução" em `src/app/design/page.tsx`.

Justificativa a registrar no commit: a ilustração era explicitamente
"enquanto não há vídeo no catálogo" (comentário em `ficha-exercicio.tsx`).
O vídeo chegou.

### Mantido
- `DiagramaMuscular` — continua como diagrama de músculos-alvo, que o
  `CONTEXT.md` cita **separadamente** da animação. Não é redundante com o
  GIF: o GIF ensina o movimento, o diagrama diz onde bate.
- `comoExecutar` no catálogo — vira o **fallback real**: mídia ausente,
  offline sem cache, ou usuário sem rede. Nunca remova.
- `FichaExercicio` como ponto de entrada e todo o seu contrato
  acessível (`Ver como executar {nome}`, `Fechar ficha do exercício`).

### Não toque
- Ids do catálogo Athlyt, `PadraoMovimento`, `GrupoMuscular`, gerador de
  plano, substituição de exercício, schema de sessão.

---

## 5. Arquitetura alvo

```
build/ops:  scripts/importar-midia-exercicios.ts
              → oss.exercisedb.dev (metadados)
              → static.exercisedb.dev (GIF)
              → R2  midia-execucao/{exercicioId}.gif
              → src/domain/plano/midia-execucao.ts (mapa versionado)

runtime:    FichaExercicio (client)
              → <img src="/api/midia-execucao/{exercicioId}" />
                 → route handler (server) → storage.ler() → bytes
                 → Cache-Control longo + SW cache
              → fallback: DiagramaMuscular + comoExecutar
```

Por que rota própria e não URL assinada direta: URL assinada expira em
minutos e **não é cacheável pelo service worker de forma estável** — na
academia offline a imagem sumiria. Rota same-origin com chave estável
casa com `static-image-assets` do Serwist e com a regra
`sameOrigin && startsWith('/api/')` já existente.

---

## 6. Passos de implementação

### Passo 1 — Cliente da ExerciseDB (domínio, testável)

**Novo:** `src/infra/exercisedb/index.ts`

```ts
export interface ExercicioExterno {
  exerciseId: string;
  nome: string;
  gifUrl: string;
  musculosAlvo: readonly string[];
  musculosSecundarios: readonly string[];
  equipamentos: readonly string[];
  instrucoes: readonly string[];   // "Step:1 " já removido
}
export function criarClienteExerciseDB(opcoes?: {
  baseUrl?: string; fetch?: typeof fetch;
}): { buscar(termo: string, limite?: number): Promise<ExercicioExterno[]>;
       porId(id: string): Promise<ExercicioExterno | null>; };
```

Regras:
- Base default `https://oss.exercisedb.dev/api/v1`, sobrescrevível por
  `EXERCISEDB_BASE_URL`.
- Busca usa **`search=`** (não `q=`). Deixe comentário explicando.
- Trate o envelope de erro sem `success`; `porId` devolve `null` em
  `NOT_FOUND`, lança nos demais.
- Normalize `instructions`: remova o prefixo `Step:N `.
- `fetch` injetável para teste sem rede.

**Novo teste:** `src/infra/exercisedb/__tests__/cliente.unit.test.ts`
com `fetch` fake — envelope de sucesso, envelope de erro, prefixo
`Step:` removido, `search` presente na URL.

### Passo 2 — Mapa curado Athlyt → ExerciseDB

**Novo:** `src/domain/plano/midia-execucao.ts`

```ts
export interface MidiaExecucao {
  exerciseId: string;      // id na ExerciseDB
  nomeOrigem: string;      // nome em inglês, para auditoria do mapeamento
  chaveObjeto: string;     // chave no R2: midia-execucao/{exercicioId}.gif
}
export const MIDIA_EXECUCAO: Readonly<Record<string, MidiaExecucao>>;
export function midiaDoExercicio(exercicioId: string): MidiaExecucao | undefined;
```

- Chave = id do catálogo Athlyt. Cobrir os **32 ids** de
  `src/domain/plano/exercicios.ts`.
- Mapeamento é **curado manualmente e revisado por humano**. Use
  `scripts/importar-midia-exercicios.ts --sugerir` (passo 4) para propor
  candidatos por busca, mas o arquivo final é escrito à mão. Casar
  "mergulho-banco" ou "flexora-elastico" por fuzzy sem revisão produz
  animação errada na tela — pior que nenhuma animação.
- Mapa parcial é legítimo: exercício sem entrada cai no fallback.

**Novo teste:** `src/domain/plano/__tests__/midia-execucao.unit.test.ts`
- toda chave de `MIDIA_EXECUCAO` existe em `EXERCICIOS` (invariante no
  mesmo espírito de `equipamentosDesconhecidos()`);
- `chaveObjeto` derivada do id, sem colisão;
- registre em comentário quantos dos 32 estão cobertos.

### Passo 3 — Rota de mídia

**Novo:** `src/app/api/midia-execucao/[exercicioId]/route.ts`

- Sessão autenticada (mesmo padrão das rotas em `src/app/api/`).
- `midiaDoExercicio(id)` → 404 se ausente.
- `criarStorageR2()` → `null` (R2 não configurado) ⇒ **404, falha
  fechada**, nunca 500. A ficha degrada para o fallback em texto.
- `storage.ler(chaveObjeto)` → resposta com `content-type: image/gif` e
  `cache-control: private, max-age=604800, immutable`.
- Objeto ausente no bucket ⇒ 404.

**Novo teste:** `src/app/api/midia-execucao/__tests__/route.unit.test.ts`
com storage fake: 200 com bytes, 404 sem mapeamento, 404 sem R2.

### Passo 4 — Script de importação

**Novo:** `scripts/importar-midia-exercicios.ts`
**Editar:** `package.json` → `"midia:importar": "tsx scripts/importar-midia-exercicios.ts"`

Modos:
- `--sugerir` — para cada id do catálogo sem mapeamento, imprime
  candidatos da busca (id, nome, equipamentos) para curadoria humana.
  Não escreve nada.
- `--espelhar` — lê `MIDIA_EXECUCAO`, baixa cada `gifUrl`, valida
  `content-type: image/gif` e tamanho > 0, e grava no R2 via
  `storage.gravar`. Idempotente: pula o que `storage.existe` confirmar,
  salvo `--forcar`.
- Sem `R2_*` configurado, sai com mensagem clara e código ≠ 0 — mesmo
  padrão de `scripts/verificar-r2.ts`.
- Relatório final: espelhados / pulados / falhos / sem mapeamento.

### Passo 5 — `FichaExercicio` passa a exibir a animação

**Editar:** `src/components/tela/ficha-exercicio.tsx`

- Nova prop opcional `midiaUrl?: string`. **A ficha não busca nada** —
  ela recebe a URL de quem já sabe se há mídia. Componente de tela
  continua sem I/O.
- Com `midiaUrl`: `<img src={midiaUrl} alt="" aria-hidden />` no lugar
  hoje ocupado por `IlustracaoExecucao`, dentro do mesmo cartão, altura
  equivalente (`h-40`), `loading="lazy"`.
- Estado de erro de carregamento (`onError`) ⇒ cai para o fallback
  visual. Offline sem cache **não pode** deixar caixa vazia.
- Sem `midiaUrl` ⇒ layout atual menos a ilustração: `DiagramaMuscular` +
  `comoExecutar`.
- `comoExecutar` permanece **sempre visível**, mesmo com a animação
  presente. É a informação acessível; o GIF é `aria-hidden`, como o SVG
  era.
- Remova os imports de `IlustracaoExecucao` / `legendaPadraoMovimento`.
- Atualize o comentário de topo: a mídia chegou, `comoExecutar` agora é
  fallback declarado — e não mais "a própria mídia".

**Editar:** `src/components/tela/index.ts` — remover os dois exports.
**Excluir:** `ilustracao-execucao.tsx` e seu teste.

### Passo 6 — Ligar na Sessão de Treino

**Editar:** `src/app/(app)/sessao/[id]/page.tsx` (≈71–77)

```tsx
midiaUrl={midiaDoExercicio(exercicio.exercicioId)
  ? `/api/midia-execucao/${exercicio.exercicioId}` : undefined}
```

A página é server component: consultar o mapa é síncrono e sem custo.

### Passo 7 — Galeria e governança de UI

**Editar:** `src/app/design/page.tsx`
- Remover a `Amostra` "Ilustração de execução" e os imports
  `IlustracaoExecucao` / `legendaPadraoMovimento`.
- Na `Amostra` "Ficha do exercício", demonstrar **os dois estados**: com
  `midiaUrl` e sem. `src/arquitetura/governanca-ui.ts` exige demonstração
  em `/design` e teste de contrato para todo componente de tela.
- Ajustar a `nota` da amostra: a ficha agora abre a animação real, com
  texto e diagrama como fallback.

Rodar `npm run ui:verificar`.

### Passo 8 — Service worker

**Editar:** `src/app/sw.ts`

`defaultCache` já casa `/api/*` GET com `NetworkFirst` de **16 entradas**
— insuficiente e semanticamente errado para mídia imutável. Adicione uma
regra **antes** de `...defaultCache`:

```ts
{
  matcher: ({ url, sameOrigin }) =>
    sameOrigin && url.pathname.startsWith("/api/midia-execucao/"),
  handler: new CacheFirst({
    cacheName: "midia-execucao",
    plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
}
```

`CacheFirst` é correto: a chave é estável e o conteúdo imutável. A ordem
importa — a regra genérica de `/api/` venceria se viesse antes.

O `public/sw.js` é gerado no build (`next build --webpack`); não edite à mão.

### Passo 9 — Ambiente e documentação

**Editar:** `.env.example`

```env
# ExerciseDB / AscendAPI — origem da Mídia de Execução (CONTEXT.md).
# Tier V1 OSS é público e não exige chave; a variável existe para
# apontar a um mock em teste ou para o host RapidAPI (V2) no futuro.
EXERCISEDB_BASE_URL=https://oss.exercisedb.dev/api/v1
```

**Novo:** `docs/midia-de-execucao.md` — origem dos dados, licença
verificada, como rodar `--sugerir` e `--espelhar`, como adicionar um
exercício novo ao mapa, comportamento sem R2.

**Novo:** ADR registrando a decisão (banco licenciado + espelhamento em
R2 + descarte do SVG artesanal). Não existe `docs/adr/` ainda — crie o
diretório; `CONTEXT.md` e `AGENTS.md` já referenciam ADRs.

### Passo 10 — E2E

**Editar:** `e2e/sessao.e2e.test.ts`

`docs/memory/mudanca-ui-atualiza-e2e.md`: mudança de UI atualiza o E2E no
mesmo conjunto. Cenário: abrir a ficha pelo ⓘ e afirmar que o texto de
execução aparece **mesmo sem R2 configurado** — é o caminho do CI. Não
dependa de rede externa no E2E; o valor testado é a degradação graciosa.

---

## 7. Ordem de execução e verificação

1. Passo 1 → `npm run test:unit`
2. Passo 2 → `npm run test:unit`
3. Passo 3 → `npm run test:unit`
4. Passo 4 → `npm run midia:importar -- --sugerir` (revisão humana do mapa)
5. Passos 5–7 → `npm run test:unit && npm run ui:verificar`
6. Passo 8–9
7. Passo 10 → `npm run test:e2e`
8. Fechamento → `npm run lint && npm run typecheck && npm run test`

**Bloqueio:** o passo 4 `--espelhar` só roda depois da conclusão de
licença da seção 3.3 estar registrada na ADR.

---

## 8. Armadilhas conhecidas

- **`q=` versus `search=`** — `?q=` devolve `{"success":true,"data":[]}`,
  sem erro. Parece "exercício não existe".
- **Mapeamento fuzzy sem revisão** — nome parecido, movimento diferente.
  A tela ensinaria o exercício errado durante a série.
- **URL assinada na `<img>`** — expira e quebra o cache offline. Use a
  rota same-origin.
- **Falha aberta sem R2** — a ficha nunca pode virar caixa vazia; sem
  storage, degrade em silêncio para o texto.
- **Ordem das regras no service worker** — `defaultCache` tem catch-all
  para `/api/`; regra específica vem antes.
- **`docs/memory/tokens-de-tipografia-e-tailwind-merge.md`** — nada de
  hex, sombra Tailwind ou `text-[size]` cru na ficha; só tokens.
- **Governança de UI** — componente de tela sem amostra em `/design` ou
  sem teste de contrato reprova em `npm run ui:verificar`.

---

## 9. Arquivos afetados — resumo

**Novos**
```
src/infra/exercisedb/index.ts
src/infra/exercisedb/__tests__/cliente.unit.test.ts
src/domain/plano/midia-execucao.ts
src/domain/plano/__tests__/midia-execucao.unit.test.ts
src/app/api/midia-execucao/[exercicioId]/route.ts
src/app/api/midia-execucao/__tests__/route.unit.test.ts
scripts/importar-midia-exercicios.ts
docs/midia-de-execucao.md
docs/adr/000X-midia-de-execucao-licenciada.md
```

**Editados**
```
src/components/tela/ficha-exercicio.tsx
src/components/tela/__tests__/ficha-exercicio.unit.test.tsx
src/components/tela/index.ts
src/app/(app)/sessao/[id]/page.tsx
src/app/design/page.tsx
src/app/sw.ts
package.json
.env.example
e2e/sessao.e2e.test.ts
```

**Excluídos**
```
src/components/tela/ilustracao-execucao.tsx
src/components/tela/__tests__/ilustracao-execucao.unit.test.tsx
```

**Intocados:** `src/domain/plano/exercicios.ts` (só leitura),
`src/components/tela/diagrama-muscular.tsx`, `src/db/schema.ts`,
gerador de plano, fluxo de substituição.
