---
type: Development Learning
title: "watch_registrar com campo inexistente na condição nunca dispara, silenciosamente"
description: "Campo inexistente em condition.field avalia sempre como false no watch engine; o agente encerra o turno esperando um wake que nunca virá, sem nenhum erro visível."
tags: [watch, pi-extension, observabilidade, diagnostico, agentes]
status: stable
generated:
  by: "agente/claude-opus-4-6"
  at: "2026-08-20T15:00:00Z"
sources:
  - id: relatorio-incidente
    resource: "/home/movida/Downloads/watch-registrar-nao-disparou-2026-08-19.md"
    title: "Relatório do incidente: watch_registrar + watch_processo_iniciar não acordaram o agente"
  - id: log-watch
    resource: "~/.pi/agent/state/watch/log.jsonl (linhas 4277-4322)"
    title: "condition.evaluated result:false para watch_767d10ad86e9 e watch_65d7180aafb0"
  - id: correcao
    resource: "/home/movida/.pi/agent/extensions/watch/core/aliases.ts, core/field-discovery.ts"
    title: "Aliases universais + aviso de campo desconhecido, implementados em 2026-08-20"
---

# Contexto

Em pelo menos 4 sessões distintas do projeto Athlyt (16 a 19 de agosto de
2026), watches registrados com `watch_registrar` contra a source `process`
nunca dispararam porque `condition.field` referenciava um nome que a source
nunca publica: `{field:"event", value:"exit"}` (a source publica
`pid`/`status`/`exitCode`/`signal`/`command`, nunca `event`) ou
`{field:"status", operator:"in", value:["completed","failed"]}` (o campo
`status` existe, mas só assume `"running"`/`"exited"`).

O motor de condições (`core/conditions.ts`) trata campo ausente como
`undefined`, e `undefined === valor esperado` é sempre `false` — sem
distinção entre "condição ainda não satisfeita" e "condição estruturalmente
impossível". `validateCondition` só valida forma (field é string, operator é
conhecido), não se o campo existe na source. O agente registrava o watch,
recebia "Watch ativo, encerre o turno", e o turno terminava sem trabalho
concluído — só a pergunta manual do usuário revelava o problema.

# Aprendizado

Em 2026-08-20 a extensão `~/.pi/agent/extensions/watch` foi corrigida com
duas mudanças que reduzem esta classe de erro:

1. **Aliases universais** (`core/aliases.ts`): toda condição agora é avaliada
   contra `event.data` **mais** três campos sintéticos derivados do envelope:
   `event` (sufixo de `type` após o último ponto — `"process.exit"` →
   `"exit"`), `type` (`event.type` completo) e `resource`. Um campo real em
   `data` sempre vence o alias. Isso faz `{field:"event", value:"exit"}`
   funcionar como a intuição do agente esperava.

2. **Aviso de campo desconhecido** (`core/field-discovery.ts`): cada
   `WatchSource` pode declarar `describeFields()` (a source `process` declara
   `pid`, `status`, `exitCode`, `signal`, `command`, `error`). No registro, se
   `condition.field` não bater com nenhum alias universal nem com
   `describeFields()`, o watch é registrado normalmente (nunca bloqueia) mas
   ganha `watch.fieldWarning` — devolvido no JSON de retorno de
   `watch_registrar` com sugestão do campo mais próximo (distância de
   Levenshtein). A checagem é só de **nome**, não de **valor**: um `field`
   válido com um valor impossível (ex.: `status: "completed"`) não é pego.

# Aplicação futura

- Ao escrever `condition` para `watch_registrar` contra a source `process`,
  prefira os campos reais (`exitCode`, `status`, `signal`) em vez do alias
  `event` quando precisar de precisão — `exitCode` distingue sucesso de
  falha, `event` só distingue "terminou" de "não terminou".
- Se o retorno de `watch_registrar` incluir `fieldWarning`, trate como sinal
  de bloqueio: cancele o watch e registre de novo com o campo sugerido antes
  de encerrar o turno. Não ignore o aviso — ele existe exatamente para evitar
  o padrão "encerrar o turno esperando um wake impossível".
- A checagem de campo não cobre valores impossíveis dentro de um campo válido
  (ex.: `status` aceita apenas `"running"`/`"exited"`; `"completed"` nunca
  ocorre apesar de ser um nome de campo válido). Ao escrever condições,
  confirme os valores possíveis lendo `describeFields()`/o tipo da source em
  `sources/*.ts`, não apenas o nome do campo.
- Se um watch ficar `active` por muito tempo sem o processo/recurso associado
  mais existir, é provável que a condição nunca fosse satisfazível — use
  `watch_status` para inspecionar `fieldWarning` e `watch_cancelar` para não
  deixar watches órfãos acumulando.

# Evidência

O log do watch engine mostrou a cadeia completa funcionando corretamente até
a avaliação: `event.received` → `event.routed (candidates:1)` →
`condition.evaluated (result:false)`, para os watches `watch_767d10ad86e9`
(pid 21478) e `watch_65d7180aafb0` (pid 24152), ambos com condição
`{field:"event", operator:"equals", value:"exit"}` contra a source
`process`.[^log-watch] Um terceiro watch (`watch_6b32fb2f1b76`, PR #116)
apresentava o mesmo defeito e permaneceu `active` por mais de 24h antes de
ser identificado e cancelado manualmente.[^relatorio-incidente]

Após a correção, um novo teste de integração
(`watch.tests/process-source.test.mjs`, "incidente 2026-08-19: condição
{field:'event', value:'exit'} agora dispara via alias") reproduz o cenário
exato do incidente contra a source `process` real (`child.on("exit")`) e
confirma o disparo; a suíte completa (56 testes, incluindo a auditoria
estática anti-polling) passa.[^correcao]

[^log-watch]: `~/.pi/agent/state/watch/log.jsonl`, linhas 4277–4322.
[^relatorio-incidente]: `~/.pi/agent/state/watch/watches/watch_6b32fb2f1b76.json`, criado 2026-08-19T11:59, cancelado 2026-08-20.
[^correcao]: `node --experimental-strip-types --test "watch.tests/*.test.mjs"` → 56/56 pass.
