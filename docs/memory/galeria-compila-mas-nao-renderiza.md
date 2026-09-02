---
type: Development Learning
title: "Build verde de galeria não prova que a story renderiza"
description: "O Storybook captura o erro de execução na moldura dele: uma story que quebra por falta de contexto do framework aparece apenas vazia, e `storybook build` sai com código 0."
tags: [storybook, design-system, ci, nextjs, verificacao, diagnostico]
status: stable
generated:
  by: agente/claude-opus-4-1
  at: 2026-08-22T09:05:00-03:00
sources:
  - id: migracao-storybook-2026-08-22
    resource: "scripts/verificar-stories.ts, .storybook/preview.tsx, .github/workflows/ci.yml, src/components/fotos/envio-fotos.stories.tsx"
    title: "Migração da galeria /design para Storybook 10 (nextjs-vite)"
---

# Contexto

Ao substituir a rota `/design` pelo Storybook, `npx storybook build` saiu com código 0 e gerou as 118 stories. O portão parecia fechado. Uma verificação em navegador real mostrou que 2 stories renderizavam um `#storybook-root` de altura 0: `EnvioFotos` chamava `useRouter`, e sem o App Router montado o hook lança `invariant expected app router to be mounted`.[^migracao-storybook-2026-08-22]

# Aprendizado

**O Storybook trata erro de render como conteúdo, não como falha.** A exceção é capturada por um error boundary e desenhada na moldura da story. Para o processo de build, nada aconteceu: o bundle compilou, o `index.json` lista a entrada, o exit code é 0. Só quem abre a story vê que ela está vazia.

Isso quebra a suposição que torna um build útil como portão de CI. `tsc` e `eslint` reprovam o que não compila; `storybook build` **não** reprova o que não renderiza. São perguntas diferentes, e apenas a segunda é a razão de a galeria existir.

A causa mais provável dessa classe de falha é contexto de framework ausente — no App Router, qualquer componente que use `useRouter`/`usePathname`. A correção pertence ao `preview`, não a cada story: `parameters.nextjs.appDirectory = true` global cobre o catálogo inteiro, enquanto declarar por story só conserta a que já se sabe quebrada.

A asserção do smoke precisa ser dupla — **nenhum erro de página e altura maior que zero**. Só `pageerror` não basta: o boundary engole a exceção antes de ela chegar ao evento de página em parte dos casos, e o que resta é a altura.

# Aplicação futura

Ao adicionar Storybook (ou qualquer galeria de componentes) a um projeto, trate `build` e `render` como dois portões distintos. Rode `npm run storybook:verificar` (`scripts/verificar-stories.ts`): ele lê `index.json`, abre cada story em `iframe.html?id=...` num Chromium de 390×844 e reprova por erro de página ou altura < 4px.

No CI, a verificação vive em `.github/workflows/galeria.yml`, não no job `estatica`: o passo levava 4 min 16 s e atrasava o único portão que exercita o produto de verdade, então migrou para um workflow próprio com `schedule` + `workflow_dispatch` + `pull_request` filtrado por `paths` (ver `check-exigido-com-paths-trava-o-merge.md`, que também registra a exigência de tirar o check da lista de `required_status_checks` do ruleset ao torná-lo condicional). Para servir o estático no runner, use `python3 -m http.server` — já existe na imagem e não baixa pacote fora do lockfile.

Um corolário que vale além do Storybook: quando uma ferramenta desenha o próprio erro na tela, o código de saída dela deixa de ser evidência. Verifique o artefato, não o processo.

# Evidência

Rodando o smoke contra o build anterior à correção do `preview`, com as mesmas 118 stories que o `storybook build` havia aprovado com exit code 0:

```
2 de 118 stories com problema:
  - Fotos/EnvioFotos / Sucesso: renderizou vazia (altura 0px)
  - Fotos/EnvioFotos / Falha: renderizou vazia (altura 0px)
```

Console da story, invisível na saída do build:

```
console: error Error: invariant expected app router to be mounted
    at useRouter (.../navigation-DFY60hCm.js:3470:68)
console: error Error rendering story 'fotos-enviofotos--sucesso'
```

Após `parameters.nextjs.appDirectory = true` em `.storybook/preview.tsx`, pelo caminho exato do CI (estático servido por `python3 -m http.server`): `118 stories renderizaram sem erro.`

[^migracao-storybook-2026-08-22]: Migração de `/design` para Storybook 10 com `@storybook/nextjs-vite`, 45 arquivos de story cobrindo `ui`, `tela`, `fotos` e `navigation`.
