# 0001 — Outbox de eventos custom para o offline da Sessão de Treino

## Status

Aceita — 2026-02-10

## Contexto

A Sessão de Treino precisa continuar funcional sem internet (timer, registros de série, Coach Local) e sincronizar depois sem duplicar eventos. A spec (`specs/mvp-vertical.md`) já exige eventos com identificador estável, timestamp do dispositivo, ordem lógica e estado de sincronização. Avaliamos três abordagens: outbox custom, sync engine pronto (PowerSync/Replicache/ElectricSQL) e local-first total (SQLite no browser).

## Decisão

Implementar um outbox custom: Service Worker cacheia o shell da PWA; eventos da sessão são gravados em IndexedDB com ID estável (UUID gerado no dispositivo), timestamp local e ordem lógica, e enviados a endpoints idempotentes ao reconectar. O escopo offline é limitado à Sessão de Treino, como a spec define.

## Consequências

- O modelo de eventos fica sob controle total do produto, alinhado à Trilha de Decisão e à auditoria.
- Sem dependência de infraestrutura adicional (serviço de sync, réplicas, protocolo proprietário).
- Conflitos são restritos ao domínio da sessão e resolvidos por regras próprias ou escalados ao usuário, como a spec pede.
- Custo: escrevemos e testamos a fila, o retry e a reconciliação nós mesmos; se o offline um dia se expandir para o app inteiro (Diário, Check-in), essa decisão precisa ser revisitada — um sync engine genérico passaria a competir melhor.

## Implementação (issue #21)

A idempotência ficou em dois níveis, e os dois são necessários. O merge
(`src/domain/sessao/outbox.ts`) é puro e idempotente por construção — coberto
por testes de propriedade que verificam reaplicação, independência de ordem e
equivalência entre sincronizar em um lote ou em pedaços. Isso sozinho não
resolve corrida: duas abas reconectando juntas passariam pela mesma leitura.
O índice único em `workout_event.client_event_id` fecha a janela no banco.

Eventos que exigem revalidar regra contra o perfil — substituição de exercício
— **não** nascem offline. O dispositivo não tem como decidir se uma
alternativa preserva o estímulo sem simular a decisão do servidor, e simular
é justamente o que a spec proíbe.

Conflito não resolvido é dado persistido (`sync_conflict`), não log: ele
sobrevive ao fechamento do app e só sai por escolha explícita do atleta na
tela 085. Escolher "servidor" também não apaga a linha — ela é a prova de que
houve divergência.
