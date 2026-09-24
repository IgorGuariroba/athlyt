---
type: Development Learning
title: "@effect/tsgo exige TypeScript 7; em TS 5.9 o portão é o @effect/language-service"
description: "O CLI do @effect/tsgo só descobre compilador de major ≥ 7 e morre com DiscoveryError num projeto TS 5.9; o que faz o `tsc` pegar os erros que ele sozinho não vê é o @effect/language-service com patch no hook `prepare`."
tags: [dependencias, typescript, effect, compilador, lint, ci]
status: stable
generated:
  by: agente/deepseek-v4.1-flash
  at: 2026-09-24T10:30:00-03:00
sources:
  - id: tsgo-dist
    resource: node_modules/@effect/tsgo/dist/effect-tsgo.cjs (0.45.0)
    title: "discoverTypeScript aceita apenas pacote de major >= 7 (isNativeTypescriptVersion) e não aceita flag de caminho no subcomando diagnostics"
  - id: tsgo-docs
    resource: https://effect-ts-tsgo.mintlify.app/introduction
    title: "Docs do Effect Language Service (tsgo) — falam de @typescript/native-preview e da versão 0.0.17, defasadas frente ao 0.45.0"
  - id: ls-readme
    resource: https://github.com/Effect-TS/language-service#readme
    title: "\"If you are using TypeScript 7.0 or newer, use @effect/tsgo instead\""
  - id: npm-ts7
    resource: https://data.jsdelivr.com/v1/packages/npm/typescript@7.0.2
    title: "typescript@7.0.2 publica 416 arquivos e nenhum lib/typescript.js"
---

# Contexto

Pedido: instalar `@effect/tsgo` para pegar erro de tipo de Effect que o compilador
sozinho não vê. O projeto está em TypeScript 5.9.3, com `typescript-eslint` type-aware
(preset máximo, que consome a API JS do compilador) e `npm run typecheck` = `tsc --noEmit`.

# Aprendizado

1. **`@effect/tsgo` 0.45.0 exige TypeScript de major ≥ 7 no projeto.** O CLI descobre o
   compilador lendo `typescript/package.json` (ou `@typescript/native`) e descartando
   qualquer versão cujo primeiro número seja menor que 7. Sem esse pacote,
   `get-exe-path`, `patch` e `diagnostics` morrem em
   `DiscoveryError: Unable to discover an installed typescript binary` — inclusive
   `diagnostics`, que não aceita flag para apontar o compilador. O binário que o pacote
   embala (`@effect/tsgo-<platform>/lib/tsc`, `Version 7.0.2+effect-tsgo.0.45.0`) é
   autossuficiente: chamado direto com `--effect-cli-diagnostics '<json>'` ele roda e
   reporta, mas isso é superfície interna e não documentada.

2. **Subir para TypeScript 7 não é um upgrade de dependência, é troca de compilador.**
   `typescript@7.0.2` é o port Go: publica `bin/tsc` e nenhuma `lib/typescript.js`.
   Sem a API JS, o `typescript-eslint` type-aware — o preset máximo que o CI usa como
   portão — não tem programa para montar. Trocar o compilador para ganhar o LSP custaria
   o lint inteiro.

3. **As docs do tsgo estão defasadas.**[^tsgo-docs] Elas descrevem `@typescript/native-preview` e
   dizem "versão atual 0.0.17"; o pacote publicado é 0.45.0 e o descobrimento real é por
   `typescript`. Ler as docs não basta para decidir a instalação: o código do CLI decidiu.

4. **O caminho que atende o pedido em TS 5.9 é o `@effect/language-service`** — o próprio
   README do tsgo diz isso ("TypeScript 7.0 ou mais novo: use `@effect/tsgo`").[^ls-readme] Ele
   funciona com o TS 5.9 do projeto, entende Effect v4 (`outdatedApi` e demais regras) e
   entra no `tsc` por patch de `node_modules/typescript`. Com o hook
   `"prepare": "effect-language-service patch"`, o patch é reaplicado a cada
   `npm ci` — inclusive no CI, e **mesmo com o gate `allow-scripts` do npm 11.16.0**,
   que barra scripts de dependências (`esbuild`, `protobufjs`) mas não o `prepare` do
   próprio projeto. Resultado: `npm run typecheck` passa a reprovar chave flutuante,
   requisito não atendido e o resto, sem script novo e sem tocar no workflow.

# Aplicação futura

- Antes de instalar ferramenta que se anuncia como "para Effect/TypeScript", confira no
  `node_modules` o que ela exige do compilador: `DiscoveryError` silencioso é o sintoma
  típico de requisito de major não atendido.
- Projeto em TS < 7 que queira os diagnósticos de Effect: `@effect/language-service` +
  entrada `{"name": "@effect/language-service"}` em `compilerOptions.plugins` +
  `prepare` com o patch. Verificação de que ligou: `npx tsc --noEmit` num arquivo com
  Effect flutuante precisa sair != 0.
- Depois de rodar `npm ci`, o patch vive só em `node_modules`: quem instalar sem o hook
  `prepare` fica com `tsc` cego, sem nenhum sinal de erro.
- Quando o projeto migrar para TypeScript 7 (e o lint conseguir acompanhar), o caminho
  passa a ser `@effect/tsgo diagnostics --project tsconfig.json` — aí sim com suporte
  oficial, `--format github-actions` e exit code por severidade.
- Enquanto o projeto estiver em TS 5.9, `@effect/tsgo` não deve ficar no `package.json`:
  ele não roda, e cada instalação carrega 7 pacotes de plataforma (um binário de ~30 MB)
  sem nenhuma função. Reinstalar faz sentido junto da migração, não antes.

# Evidência

CLI do tsgo contra o projeto em TS 5.9.3:[^tsgo-dist]

```
$ npx @effect/tsgo get-exe-path
ERROR (#1): DiscoveryError: Unable to discover an installed typescript binary.
```

O mesmo binário, chamado direto no arquivo com Effect flutuante, reporta e sai != 0
(com `--list-files` ele confirma `detected=v4, supported=v4`):[^tsgo-dist]

```
$ node_modules/@effect/tsgo-linux-x64/lib/tsc --effect-cli-diagnostics '{"cwd":"...","file":".../probe.ts","format":"pretty",...}'
error effect(floatingEffect): This Effect value is neither yielded nor used in an assignment.
1 errors, 0 warnings and 1 messages.
```

`typescript@7.0.2` não traz a API JS:[^npm-ts7]

```
$ curl -s 'https://data.jsdelivr.com/v1/packages/npm/typescript@7.0.2?structure=flat' | ...
416 files
['/lib/getExePath.d.ts', '/lib/getExePath.js', '/lib/tsc.js', '/lib/version.cjs', ...]
# nenhum lib/typescript.js
```

Após `npx -y npm@11.16.0 ci` (versão de npm do runner), sem nenhum passo manual, o
`tsc` do projeto já reporta os diagnósticos:

```
$ npx tsc --noEmit
probe.ts(6,3): error TS3: This Effect value is neither yielded nor used in an assignment.    effect(floatingEffect)
probe.ts(8,3): message TS11: This generator returns an Effect-able value directly, ...    effect(returnEffectInGen)
tsc exit=2
```

O hook não foi barrado pelo gate de scripts do npm 11.16.0 — a mensagem `allow-scripts`
listou apenas dependências (`esbuild@0.18.20`, `protobufjs@7.6.5`, ...), e
`npm run prepare` na sequência respondeu `already patched with version 0.87.2`, ou seja,
o patch já tinha sido aplicado durante o `npm ci`.[^tsgo-dist]

[^tsgo-dist]: `@effect/tsgo@0.45.0` — código de descoberta e binário embalado.
[^ls-readme]: README do `@effect/language-service@0.87.2` — regra de escolha por versão de TypeScript.
[^npm-ts7]: Listagem de arquivos do `typescript@7.0.2` via API do jsDelivr.
[^tsgo-docs]: Docs do Effect Language Service (tsgo) — instalação, subcomandos e pinagem.