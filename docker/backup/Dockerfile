# syntax=docker/dockerfile:1

# Imagem do serviço de backup: pg_dump + cliente S3.
#
# A base é `postgres:16` — a mesma major do serviço `db`. pg_dump se
# recusa a operar contra um servidor de versão maior que a sua, então
# manter as duas versões atreladas evita que um upgrade do banco
# quebre o backup silenciosamente.
FROM minio/mc:latest AS mc

FROM postgres:16

# A imagem oficial do Postgres não traz agendador (é feita para rodar
# o servidor em primeiro plano), então o cron vem do apt.
RUN apt-get update \
  && apt-get install -y --no-install-recommends cron \
  && rm -rf /var/lib/apt/lists/*

# `mc` é um binário estático: copiar da imagem oficial dispensa
# instalar pacotes e mantém a superfície da imagem pequena.
COPY --from=mc /usr/bin/mc /usr/local/bin/mc

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/backup.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
