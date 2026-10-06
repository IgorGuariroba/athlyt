---
type: Development Learning
title: "Imagem base removida do registry quebra o build sem tocar em código"
description: "`pull access denied, repository does not exist` num `FROM` é o repositório removido do registry, não credencial expirada; confirme o 404 antes de mexer em login e troque por base mantida."
tags: [docker, deploy, dokploy, backup, diagnostico, producao]
status: stable
generated:
  by: agente/deepseek-v4.1-flash
  at: 2026-10-06T10:03:16-03:00
sources:
  - id: log-deploy-athlyt
    resource: "dokploy deployment.readLogs --deploymentId 2cbftsvVF-z1dHOhqtUiu"
    title: "Build do compose athlyt falhando em `FROM minio/mc:latest`"
  - id: hub-minio-mc
    resource: "https://hub.docker.com/v2/repositories/minio/mc"
    title: "404: repositório minio/mc removido do Docker Hub"
  - id: docker-backup
    resource: docker/backup/Dockerfile
    title: "Base do serviço de backup"
---

# Contexto

Os deploys de produção do athlyt passaram a falhar em 2026-09-23 sem nenhum
commit tocando infraestrutura. O build do compose morria em ~9 s, antes de subir
container:

```
#6 [backup internal] load metadata for docker.io/minio/mc:latest
#6 ERROR: pull access denied, repository does not exist or may require
   authorization: server message: insufficient_scope: authorization failed
target backup: failed to solve
```

A mensagem tem cara de credencial (`authorization failed`, `insufficient_scope`),
o que empurra o diagnóstico para `docker login` ou token de registro. Não era
isso.

# Aprendizado

O MinIO apagou os repositórios `minio/minio` e `minio/mc` do Docker Hub em
**2026-09-11** e fechou o Quay em 24/09; `dl.min.io` responde 410. O Docker Hub
devolve a **mesma frase** para "não existe" e para "sem permissão" — quando o
`FROM` aponta para uma imagem pública e o login não mudou, a hipótese primária é
repositório removido, não credencial.

Fixar uma tag anterior **não** resolve: o repositório inteiro saiu do ar, não só
a `latest`. O último deploy verde do athlyt foi 2026-09-10; a primeira tentativa
depois da remoção foi a de 23/09, exatamente a que abriu a série de falhas. Três
deploys seguidos reprovaram no mesmo ponto, o que descarta flakiness e olha
direto para a base.

# Aplicação futura

1. `FROM` falhando com `pull access denied`: cheque o registry antes de tocar em
   credencial —
   `curl -o /dev/null -w '%{http_code}' https://hub.docker.com/v2/repositories/<org>/<img>/tags/`.
   `404` encerra a dúvida.
2. Não resolva com `docker login`: a superfície muda, o problema continua.
3. Ao trocar o cliente, prefira uma base mantida e ativa. No serviço de backup,
   o `minio/mc` virou `rclone/rclone` — binário Go estático, então o
   `COPY --from` para o `postgres:16` dispensa pacote e mantém a imagem pequena.
4. `rclone` se configura por variável de ambiente (`RCLONE_CONFIG_<REMOTE>_*`),
   sem `rclone config` interativo nem arquivo de credencial: `copyto` substitui
   `mc cp` e `delete --min-age` substitui `mc rm --older-than`.

# Evidência

- `docker/backup/Dockerfile` construía `FROM minio/mc:latest AS mc` para copiar
  `/usr/bin/mc`.[^docker-backup]
- Deploy `2cbftsvVF-z1dHOhqtUiu` (commit d17274e): erro no `#6`, `Dockerfile:9`.
  Mesmo erro em `ssxDgaSwRMd3_Oj_8Va0Y` (#236) e `16KW3-fN9BE7AhLLIcUry`
  (#235).[^log-deploy-athlyt]
- `hub.docker.com/v2/repositories/minio/mc` → `404`;
  `quay.io/api/v1/repository/minio/mc/tag` → lista vazia;
  `dl.min.io/client/mc/release/linux-amd64/mc` → `410 Gone`.[^hub-minio-mc]
- Após a troca, `docker build docker/backup` passa e um `backup.sh` real
  (pg_dump → gzip → upload → expurgo) roda contra um S3 de teste: o arquivo de
  40 dias é removido pela retenção e os recentes permanecem.

[^docker-backup]: Base do serviço de backup.
[^log-deploy-athlyt]: Três deploys consecutivos com o mesmo erro de pull.
[^hub-minio-mc]: Repositório `minio/mc` inexistente nos registries.
