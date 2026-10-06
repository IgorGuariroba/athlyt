# syntax=docker/dockerfile:1

# Imagem do serviço de backup: pg_dump + cliente S3.
#
# A base é `postgres:16` — a mesma major do serviço `db`. pg_dump se
# recusa a operar contra um servidor de versão maior que a sua, então
# manter as duas versões atreladas evita que um upgrade do banco
# quebre o backup silenciosamente.
#
# O cliente S3 é o `rclone`, copiado da imagem oficial `rclone/rclone`.
# Não voltar para `minio/mc`: o MinIO apagou os repositórios
# `minio/mc` e `minio/minio` do Docker Hub em 2026-09-11 (e fechou o
# Quay em 2026-09-24), então o build passou a falhar com
# `pull access denied, repository does not exist`.
FROM rclone/rclone:latest AS rclone

FROM postgres:16

# A imagem oficial do Postgres não traz agendador (é feita para rodar
# o servidor em primeiro plano), então o cron vem do apt.
RUN apt-get update \
  && apt-get install -y --no-install-recommends cron \
  && rm -rf /var/lib/apt/lists/*

# `rclone` é um binário estático (Go, sem dependências dinâmicas):
# copiar da imagem oficial dispensa instalar pacotes e mantém a
# superfície da imagem pequena.
COPY --from=rclone /usr/local/bin/rclone /usr/local/bin/rclone

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/backup.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
