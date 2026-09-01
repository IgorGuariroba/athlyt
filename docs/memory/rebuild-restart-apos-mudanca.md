---
type: Development Learning
title: "Após mudanças, reconstruir e reiniciar a aplicação em produção"
description: "A URL acessada pelo Tailscale Funnel serve o processo Next.js em modo produção; mudanças só ficam disponíveis após novo build e reinício do app."
tags: [deploy, nextjs, tailscale, producao]
status: stable
generated:
  by: agente/gpt-5.6-sol
  at: 2026-07-30T20:24:48-03:00
sources:
  - id: user-instruction-2026-07-30
    resource: "sessão de desenvolvimento 019fb541-9d09-7567-8fa9-51b8052bdb21"
    title: "Instrução sobre o ambiente servido pelo Tailscale"
  - id: revisao-treino-2026-08-07
    resource: "src/app/(auth)/plano/revisao/treino/page.tsx, /tmp/athlyt-start.log"
    title: "Rebuild servindo página antiga ao redesenhar a revisão de treino"
  - id: app-local-2026-08-07
    resource: "scripts/app-local.sh, package.json, next.config.ts"
    title: "Procedimento encapsulado em app:up/app:down após a adopção do standalone"
---

# Contexto

A aplicação é usada pela URL exposta via Tailscale Funnel e deve rodar como build de produção, não pelo servidor de desenvolvimento do Next.js.

# Aprendizado

Alterar o código-fonte não atualiza a aplicação em uso. Depois de cada conjunto de mudanças, é obrigatório executar um novo build de produção e reiniciar o processo que serve a porta 3000.[^user-instruction-2026-07-30]

# Aplicação futura

O procedimento está encapsulado em `npm run app:up` (build limpo, subida
desacoplada e espera até `/api/saude` responder) e `npm run app:down`.
Prefira esses comandos a executar os passos à mão.[^app-local-2026-08-07]

As armadilhas que motivaram o script, todas já tratadas por ele:[^revisao-treino-2026-08-07]

- O build incremental pode reaproveitar o chunk antigo de uma rota e servir a
  versão anterior mesmo após `npm run build`. Por isso `app:up` sempre apaga
  `.next` antes de reconstruir.
- `nohup npm start &` a partir do agente morre junto com a sessão do comando;
  é preciso `setsid`.
- Com `output: "standalone"`, **`next start` deixa de valer** — ele avisa e o
  servidor canônico passa a ser `.next/standalone/server.js`, o mesmo que a
  imagem Docker executa.
- O standalone **não copia** `.next/static` nem `public`: sem copiá-los ao
  lado de `server.js`, a página abre sem CSS nem JS e a causa não é óbvia na
  tela.
- A raiz do standalone é inferida por lockfiles nos diretórios acima. Um
  `package-lock.json` solto no home do usuário fez a saída aninhar em
  `.next/standalone/<caminho>/server.js`; `outputFileTracingRoot` fixa a raiz
  e mantém local e Docker consistentes.

# Evidência

O responsável pelo ambiente informou que a aplicação é utilizada em modo produção por meio do Tailscale e pediu que build e reinício sejam feitos após toda mudança.[^user-instruction-2026-07-30]

[^user-instruction-2026-07-30]: Consulte `sources` com id `user-instruction-2026-07-30`.
[^revisao-treino-2026-08-07]: Consulte `sources` com id `revisao-treino-2026-08-07`.
[^app-local-2026-08-07]: Consulte `sources` com id `app-local-2026-08-07`.
