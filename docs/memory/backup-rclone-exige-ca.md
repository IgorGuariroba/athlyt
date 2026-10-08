---
type: Development Learning
title: "Backup com rclone exige certificados CA na imagem PostgreSQL"
description: "Copiar o binário rclone para postgres:16 não copia a cadeia de certificados necessária ao upload HTTPS."
tags: [docker, backup, tls, rclone]
status: stable
generated:
  by: agente/codex
  at: 2026-10-08T14:35:00Z
sources:
  - id: backup-r2-2026-10-08
    resource: docker/backup/Dockerfile
    title: "Falha do backup agendado e instalação de ca-certificates"
---

# Contexto

O backup agendado gerou o dump, mas o rclone falhou no R2 com `x509: certificate signed by unknown authority`. A base `postgres:16` não tinha `/etc/ssl/certs/ca-certificates.crt`.

# Aprendizado

O binário estático do rclone não inclui o trust store do sistema. Instalar `ca-certificates` na imagem final resolve a verificação HTTPS; não usar opções que desabilitem TLS.

# Aplicação futura

Validar a presença da cadeia CA e um upload real após trocar a base ou o cliente S3. Container ativo e dump local gerado não comprovam backup externo. Manter a verificação de idade da cópia externa no Kuma, além dos avisos de falha do Dokploy.
