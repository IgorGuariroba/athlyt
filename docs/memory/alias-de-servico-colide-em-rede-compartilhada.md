---
type: Development Learning
title: "Em rede compartilhada, `db` não é um nome: é um alias disputado"
description: "Dois projetos com um serviço chamado `db` na dokploy-network fazem o DNS do Docker responder em round-robin, e o app vizinho autentica contra o Postgres errado com falhas intermitentes 28P01."
tags: [deploy, docker, compose, dokploy, dns, postgres, diagnostico, producao]
status: stable
generated:
  by: agente/claude-opus-4-6
  at: 2026-08-10T10:30:00-03:00
sources:
  - id: incidente-2026-08-10
    resource: "docker/compose.prod.yml, logs do container bfin-app-cuyqsk-app-1"
    title: "Serviço vizinho passou a falhar no login logo após o primeiro deploy do Athlyt"
---

# Contexto

Minutos depois de o Athlyt subir em produção pela primeira vez, o login de
**outro** serviço da mesma VPS começou a falhar. O sintoma parecia de rede — a
suspeita imediata foi conflito de porta, já que ambos usam 3000 e Postgres.

O log desmentiu a hipótese:[^incidente-2026-08-10]

```
[auth][cause]: Error: Failed query: select ... from "Account" inner join "User" ...
[auth][details]: { "severity": "FATAL", "code": "28P01", "routine": "auth_failed" }
```

`28P01` é *password authentication failed*. A conexão TCP **abriu** e o
handshake **começou**: não havia porta ocupada nem serviço fora do ar. Um
Postgres alcançável recusou as credenciais — logo, o app falava com o banco
errado. E as falhas eram **intermitentes** (12:47, 12:52, 13:16), não contínuas.

O container do app vizinho estava de pé havia 25 horas, sem redeploy. Ele não
mudou; mudou o vizinho que entrou na rede.

# Aprendizado

O Compose registra cada serviço no DNS da rede **pelo nome do serviço**. Numa
rede compartilhada por vários projetos — a `dokploy-network` é exatamente isso —
esse nome deixa de ser privado: vira um identificador global disputado.

Com dois projetos declarando `db`, o embedded DNS do Docker resolve `db` para
**dois IPs** e alterna entre eles. Daí a assinatura do incidente:

| Observação | O que descarta |
| --- | --- |
| `28P01`, não `ECONNREFUSED` | porta ocupada, serviço fora do ar |
| Falha intermitente, não constante | credencial errada no próprio `.env` |
| Vítima sem redeploy há 25h | mudança no código da vítima |

Intermitência com destino aparentemente correto é **assinatura de round-robin de
DNS**, e não de credencial: uma senha errada falha 100% das vezes.

O caso geral: **isolamento de nomes é uma propriedade da rede, não do arquivo.**
Dentro de um compose isolado, `db` é inequívoco e legível; ao anexar o projeto a
uma rede de plataforma, o mesmo nome passa a colidir com o de qualquer vizinho
que teve a mesma ideia — e `db`, `redis`, `cache` e `api` são justamente os nomes
que todo mundo escolhe. O dano recai sobre o **vizinho**, que não mudou nada, e
por isso ninguém procura a causa no serviço recém-implantado.

É o mesmo princípio de [publicar porta sob um proxy de
plataforma](porta-publicada-colide-com-o-proxy.md): um default plausível no
compose isolado vira defeito ao entrar numa infraestrutura compartilhada.

# Aplicação futura

Ao levar um compose para uma plataforma com rede compartilhada, **qualifique os
nomes de serviço com o do projeto** (`athlyt-db`, não `db`) antes do primeiro
deploy. Vale para todo serviço que ganhe alias na rede externa, não só o banco.

Confirme antes de subir — `config` mostra os nomes finais:

```bash
docker compose -f docker/compose.prod.yml config | grep -E '^  [a-z-]+:'
```

Para diagnosticar uma suspeita de colisão, resolva o nome de dentro da vítima
algumas vezes seguidas; se o IP oscilar, há mais de um container no alias:

```bash
for i in 1 2 3 4 5; do docker exec <app> getent hosts db; done
docker network inspect dokploy-network --format '{{range .Containers}}{{.Name}}{{println}}{{end}}'
```

Regra de triagem que economiza o desvio desta investigação: **classifique o erro
do banco antes de suspeitar da rede.** `ECONNREFUSED`/timeout apontam para
topologia (porta, rota, serviço morto); `28P01` prova o contrário — chegou-se a
um Postgres de verdade, e a pergunta certa passa a ser *qual*.

# Evidência

O painel do Dokploy listava `athlyt-athlyt-t9oeii-db-1` e
`bfinbackend-bfinbackend-nkjhcm-db-1` simultaneamente, ambos `postgres` em
5432/tcp, com o `bfin-app` num terceiro projeto — comunicação entre projetos que
só ocorre pela rede compartilhada. Após renomear o serviço para `athlyt-db`,
`docker compose config` não emite nenhum serviço `db` e todas as `DATABASE_URL`
renderizam `@athlyt-db:5432`.[^incidente-2026-08-10]

[^incidente-2026-08-10]: Consulte `sources` com id `incidente-2026-08-10`.
