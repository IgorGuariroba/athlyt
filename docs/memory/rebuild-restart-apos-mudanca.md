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
---

# Contexto

A aplicação é usada pela URL exposta via Tailscale Funnel e deve rodar como build de produção, não pelo servidor de desenvolvimento do Next.js.

# Aprendizado

Alterar o código-fonte não atualiza a aplicação em uso. Depois de cada conjunto de mudanças, é obrigatório executar um novo build de produção e reiniciar o processo que serve a porta 3000.[^user-instruction-2026-07-30]

# Aplicação futura

Antes de concluir qualquer tarefa com mudança de código:

1. executar `npm run build`;
2. encerrar o processo anterior da aplicação;
3. iniciar novamente com `npm start`, mantendo a porta 3000 atendida pelo Tailscale Funnel;
4. confirmar que o processo está ativo.

# Evidência

O responsável pelo ambiente informou que a aplicação é utilizada em modo produção por meio do Tailscale e pediu que build e reinício sejam feitos após toda mudança.[^user-instruction-2026-07-30]

[^user-instruction-2026-07-30]: Consulte `sources` com id `user-instruction-2026-07-30`.
