---
type: Development Learning
title: "Sob um proxy de plataforma, publicar porta no host é conflito, não conveniência"
description: "No Dokploy o Traefik alcança o container pela rede interna; o `ports` do compose só disputa a porta com o próprio painel e derruba o deploy depois de o banco já ter migrado."
tags: [deploy, docker, compose, dokploy, traefik, producao]
status: stable
generated:
  by: agente/claude-sonnet-4-5
  at: 2026-08-08T11:20:00-03:00
sources:
  - id: pr-67
    resource: "docker/compose.prod.yml, docker/compose.prod.porta.yml"
    title: "Primeiro deploy no Dokploy falhando em `port is already allocated`"
---

# Contexto

`docker/compose.prod.yml` publicava a porta do app no host de forma
incondicional (`${APP_BIND:-127.0.0.1}:${APP_PORT:-3000}:3000`), pensando no
proxy reverso que termina o TLS. No primeiro deploy pelo Dokploy o banco subiu
saudável, o serviço `migracao` aplicou as migrações e saiu com `Exited (0)`, e
só então o app morreu:[^pr-67]

```
Bind for 0.0.0.0:3000 failed: port is already allocated
```

A 3000 do host já era do painel do Dokploy.

# Aprendizado

Publicar porta no host e estar atrás de um proxy são **duas topologias
distintas**, e qual delas vale depende do host, não do aplicativo:

| Onde o proxy roda | Como ele alcança o container | Precisa de `ports` |
| --- | --- | --- |
| Container na mesma rede Docker (Traefik do Dokploy) | rede interna, pelo nome do serviço | não |
| Processo do host (Caddy/nginx instalado na VPS) | `127.0.0.1:porta` | sim |

No primeiro caso o `ports` não só é inútil como ativamente nocivo: consome uma
porta do host que a plataforma provavelmente já usa. E a falha chega tarde —
depois de volumes criados e migrações aplicadas —, então o estado fica meio
construído e o log de erro aponta para rede, não para configuração.

O caso geral: **o que varia por ambiente de execução não pertence ao arquivo
que descreve o serviço.** Um default plausível na VPS avulsa vira defeito na
plataforma gerenciada. Compose resolve isso com overlay, não com variável — não
há valor de `APP_PORT` capaz de suprimir a publicação, porque a lista de portas
não aceita entrada vazia.

# Aplicação futura

Ao levar um compose para uma plataforma com proxy próprio (Dokploy, Coolify,
CapRover), remova `ports` do arquivo principal e ofereça a publicação como
overlay opcional:

```bash
# Dokploy: Traefik entra pela dokploy-network
docker compose -f docker/compose.prod.yml up -d

# VPS avulsa: o proxy é processo do host e precisa da porta
docker compose -f docker/compose.prod.yml \
               -f docker/compose.prod.porta.yml up -d
```

Confirme o resultado sem subir nada — `config` renderiza o arquivo final:

```bash
docker compose -f docker/compose.prod.yml config | grep -c published   # 0
```

O mesmo raciocínio vale para qualquer serviço novo adicionado ao painel: exponha
pela rede do proxy e deixe o host sem porta publicada.

# Evidência

Com o `ports` removido, `docker compose config` não emite nenhuma chave
`published`; acrescentando o overlay `compose.prod.porta.yml`, a saída volta a
trazer `host_ip: 127.0.0.1` e `published: "3000"`. As duas topologias saem do
mesmo arquivo base, sem duplicação.[^pr-67]

[^pr-67]: Consulte `sources` com id `pr-67`.
