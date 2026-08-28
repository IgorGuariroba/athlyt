---
type: Development Learning
title: "Teto de memória do servidor de dev precisa ser de cgroup, não de heap"
description: "Com Turbopack, o grafo vive em memória nativa fora do heap do V8: --max-old-space-size não contém o crescimento e aparenta proteger enquanto a máquina vai para o swap."
tags: [nextjs, dev, memoria, turbopack, cgroup, ambiente, diagnostico]
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
  - id: reincidencia
    resource: relato do usuário, 2026-08-14
    title: "4,4 GB de RSS anônimo com o teto de heap de 2 GB ativo"
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

## Correção de 2026-08-14: o teto de heap não segurava

O incidente se repetiu com o `--max-old-space-size=2048` ativo, desta vez em
4,4 GB. O teto não foi violado — ele é irrelevante para o alocador que domina.

A causa acima estava incompleta. Desde que `turbopack: {}` entrou em
`next.config.ts`, o `next dev` compila em Rust via N-API e mantém o grafo de
módulos em **memória nativa, fora do heap do V8**. `--max-old-space-size`
governa apenas o old space do V8, então o processo cresce livremente enquanto a
flag *aparenta* proteger — o pior modo de falha possível, porque suprime o
sinal até a máquina swappar.

O agravante nesse dia foi a suíte E2E rodando contra o `next dev`: varrer dezenas
de rotas em minutos é o pior caso para um servidor que nunca libera o que
compila.

# Aplicação futura

**Limitar memória de processo por cgroup, não por flag de runtime.** Uma flag
vale para um motor específico e caduca em silenço quando o motor muda; o cgroup
vale para heap do V8, arena do Turbopack e qualquer sucessor. `scripts/dev-local.sh`
sobe o `next dev` sob `systemd-run --user --scope` com `MemoryMax`/`MemoryHigh`.

**`MemorySwapMax=0` é o item que preserva a sessão.** Não é o tamanho do
processo que trava a máquina, é o swap. Sem ele, o estouro vira SIGKILL do OOM
killer do cgroup (exit 137) e o resto do sistema segue vivo.

**Ao suspeitar de vazamento, comparar `RssAnon` com o teto configurado antes de
qualquer hipótese sobre código.** `grep RssAnon /proc/<pid>/status` acima do
`--max-old-space-size` prova que a memória está fora do heap e que a flag não
está no caminho.

**Não rodar E2E contra o `next dev`.** O padrão de `playwright.config.ts` é
`next start`, igual ao CI.

Ao diagnosticar lentidão geral da máquina durante desenvolvimento, medir
`.next/dev` antes de suspeitar do código: acima de ~1 GB, limpar — o `npm run
dev` agora avisa sozinho. Não deixar `npm run dev` e `npm run app:up` de pé ao
mesmo tempo — são dois servidores Node do mesmo app.

# Evidência

`NODE_OPTIONS` vazio no ambiente e nenhuma referência a `max-old-space` nos
scripts antes da correção[^script]. `du -sh .next/dev` retornou 3,5 GB, com
`.next/dev/cache` em 3,0 GB e `.next/dev/server` em 380 MB; `.next/cache/webpack`
somava outros 427 MB. Após `rm -rf .next/dev`, `.next` caiu de 4,0 GB para
501 MB[^incidente].

Na reincidência, `/proc/<pid>/status` do `next-server` acusou `RssAnon:
4.464.036 kB` contra um teto de 2.048 MB, com apenas 4,6 min de processo e a
suíte E2E ativa; o swap da máquina estava em 1,8 GB e `.next` em 2,8 GB[^reincidencia].

O teto de cgroup foi verificado lendo `memory.max`, `memory.high` e
`memory.swap.max` de dentro do scope, e o comportamento de estouro reproduzido
com `MemoryMax=200M`: SIGKILL, exit 137, sem uso de swap.

[^script]: `scripts/dev-local.sh`, função `subir`.
[^incidente]: Medições feitas na investigação de 2026-08-13.
[^reincidencia]: Medições feitas na investigação de 2026-08-14.
