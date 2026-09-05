# AGENTS.md

**Understand requirements and existing contracts, assess impact and regression risk, then implement the simplest correct, concise, readable, idiomatic, cohesive, and maintainable solution following KISS, DRY, and YAGNI; preserve existing behavior and conventions, minimize coupling and abstractions, verify with relevant tests and checks, and validate acceptance criteria and integrated behavior before completion.**

## Local Development

Run the project with `npm run dev`.

## Component Gallery

Storybook (`npm run storybook`) is the visual source of truth for the design system, not a product route. The former `/design` route is deprecated.

Every component under `src/components/**` must have an adjacent `*.stories.tsx` story. Components outside the `ui` layer must also have a contract test.

Run `npm run ui:verificar` to enforce these requirements; failures report the exact missing file.

Run `npm run storybook:verificar` to ensure every story actually renders. `storybook build` verifies compilation but not rendering. See `docs/memory/galeria-compila-mas-nao-renderiza.md`.

## Dívida de lint em lotes

`eslint.config.mjs` roda o preset máximo: `strictTypeChecked` + `stylisticTypeChecked` do `typescript-eslint` (regras type-aware, exigem o programa TypeScript) e o `jsx-a11y` recommended completo. O lint sai de ~11 s para ~26 s; o custo é aceito de propósito.

Ligar o preset revelou 1024 achados pré-existentes. Eles estão registrados em `eslint-suppressions.json`, o recurso nativo do ESLint 9.24+: `npm run lint` fica verde e o CI continua barrando **qualquer achado novo**, inclusive de regra já suprimida em outro arquivo.

O arquivo de supressões é dívida, não gabarito. Fluxo por lote:

1. `npm run lint:pendencias` lista o que falta, agrupado por regra.
2. `npm run lint:pendencias -- <regra>` mostra os arquivos daquela regra.
3. Numa branch por lote, corrija os achados escolhidos.
4. `npm run lint:lote` (`eslint --prune-suppressions`) remove do arquivo as supressões que deixaram de ser necessárias.
5. Faça commit do código **e** do `eslint-suppressions.json` reduzido.

Um lote é uma regra, ou um grupo coeso de regras. Não misture lotes de corretude com lotes de estilo: o diff de estilo é grande e esconde a revisão do que muda comportamento.

Nunca zere supressões com `--suppress-all` para "passar o CI" — isso reabre a dívida em silêncio. O comando só se justifica ao adotar uma regra nova, num commit que faça apenas isso.

## Fluxo de validação local

Para validar alterações na aplicação web:

1. Execute `npm run app:down`.
2. Execute `npm run app:up`.
3. Acesse `http://localhost:3000` usando `playwright-cli` e confira o fluxo e o resultado visual.
4. Ao terminar, feche o navegador com `playwright-cli close`.

## Web Test Evidence

When running Playwright E2E tests, save evidence to `/home/movida/Downloads/evidencias-e2e/`.

Use descriptive filenames and keep screenshots, videos, traces, and other evidence artifacts local and unversioned.

## Development Memory

Reusable development knowledge belongs in the OKF bundle under `docs/memory/`.

After completing a task or investigation, assess whether a durable insight emerged that can prevent a recurring mistake or reproduce a relevant success. Record it only when it has lasting value and is not already evident in the code itself.

The agent decides when a memory is warranted. If the user says **“grave isso na memória”**, recording it is mandatory.

Do not record trivial occurrences, temporary issue details, discarded attempts without reusable value, or duplicated documentation. Update an existing memory instead of creating a duplicate.

Use `docs/templates/memory-okf.md` as the reference. When creating or updating a memory, also update `docs/memory/index.md` and `docs/memory/log.md`.

Keep knowledge in its canonical location:

* Reusable development knowledge → `docs/memory/`
* Everything else — requirements, domain vocabulary, the reasoning behind a decision — lives in the code it governs, as a comment next to what it explains.
