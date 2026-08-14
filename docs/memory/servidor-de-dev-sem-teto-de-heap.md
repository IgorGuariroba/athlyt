---
type: Development Learning
title: "Servidor de dev sem teto de heap cresce até derrubar a máquina"
description: "Sem --max-old-space-size, o next dev dimensiona o heap pela RAM total e o crescimento por HMR só para quando o sistema entra em swap."
tags: [nextjs, dev, memoria, turbopack, ambiente, diagnostico]
status: stable
generated:
  by: agente
  at: 2026-08-13T11:10:00-03:00
sources:
  - id: incidente
    resource: relato do usuário, 2026-08-13
    title: "next-server ocupando ~5,5 GB e travando outros processos"
  - id: script
    resource: scripts/dev-local.sh
    title: "Linha de início do next dev"
---

# Contexto

Durante uma sessão longa de desenvolvimento, o processo `next-server` chegou a
cerca de 5,5 GB de RSS. Com o navegador ocupando outros ~3 GB, os 15 GB da
máquina acabaram, o swap encheu e a sessão de trabalho inteira ficou inutilizável
— sem nenhum erro vindo da aplicação.

# Aprendizado

O `next dev` não tem vazamento pontual a ser corrigido: ele cresce por
construção. O HMR mantém vivas versões antigas de módulos server-side enquanto
houver referência, e cada rota visitada retém grafo de dependência e source maps.
Com mais de cinquenta rotas e dependências pesadas carregadas no servidor
(OpenTelemetry completo, AWS SDK S3, `pg-boss`, `ai`, drizzle), o crescimento é
monotônico ao longo da sessão.

O que transforma esse crescimento em incidente é a ausência de teto: sem
`--max-old-space-size`, o V8 dimensiona o old space pela RAM total da máquina e
só faz GC agressivo perto desse teto implícito. Na prática, o processo cresce até
disputar memória com o resto do sistema, e o sinal que chega ao usuário é a
máquina travando — não o Next falhando.

O tamanho do cache em disco é o termômetro barato do problema: no incidente,
`.next/dev` estava com 3,5 GB (3,0 GB só em `.next/dev/cache`).

# Aplicação futura

Manter o `NODE_OPTIONS` com teto no `scripts/dev-local.sh`, na forma
`${NODE_OPTIONS:---max-old-space-size=2048}`, para que o ambiente possa
sobrescrever. Com teto, o GC atua antes de sufocar o sistema e um estouro real
vira OOM explícito do Node, que aponta para a causa.

Ao diagnosticar lentidão geral da máquina durante desenvolvimento, medir
`.next/dev` antes de suspeitar do código: acima de ~1 GB, limpar. Reiniciar o
`next dev` a cada poucas horas resolve o acúmulo de sessão. Não deixar `npm run
dev` e `npm run app:up` de pé ao mesmo tempo — são dois servidores Node do mesmo
app.

# Evidência

`NODE_OPTIONS` vazio no ambiente e nenhuma referência a `max-old-space` nos
scripts antes da correção[^script]. `du -sh .next/dev` retornou 3,5 GB, com
`.next/dev/cache` em 3,0 GB e `.next/dev/server` em 380 MB; `.next/cache/webpack`
somava outros 427 MB. Após `rm -rf .next/dev`, `.next` caiu de 4,0 GB para
501 MB[^incidente].

[^script]: `scripts/dev-local.sh`, função `subir`.
[^incidente]: Medições feitas na investigação de 2026-08-13.
