# 0002 — Fila de jobs no próprio Postgres (pg-boss)

## Status

Aceita — 2026-02-10

## Contexto

A spec exige processos assíncronos idempotentes (Revisão Semanal, limpeza de retenção, sincronização, futuras integrações) rodando em VPS via Dockploy, com monitoramento externo. Alternativas: BullMQ+Redis, cron externo chamando endpoints HTTP, ou fila persistida no próprio PostgreSQL.

## Decisão

Usar o próprio PostgreSQL como fila e agendador de jobs, via pg-boss (ou equivalente), com um worker Node em container próprio no mesmo deploy Dockploy.

## Consequências

- Nenhum serviço adicional na VPS: um único banco para dados, fila e agendamentos — um único alvo de backup e monitoramento.
- Idempotência e exactly-once viáveis com constraints e transações SQL, alinhado à exigência da spec.
- Estado dos jobs auditável por SQL, coerente com a cultura de Trilha de Decisão.
- Limite: throughput de fila em Postgres é inferior a Redis; irrelevante para app single-user, mas a decisão deve ser revisitada se o produto abrir para múltiplos usuários.
