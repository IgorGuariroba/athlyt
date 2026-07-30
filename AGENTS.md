# AGENTS.md

## Agent skills

### Issue tracker

Issues e PRDs são rastreados no GitHub; pull requests externos não são uma superfície de triagem. Consulte `docs/agents/issue-tracker.md`.

### Triage labels

O projeto usa os cinco rótulos canônicos: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human` e `wontfix`. Consulte `docs/agents/triage-labels.md`.

### CI e proteção da main

A esteira de CI vive em `.github/workflows/ci.yml` e a `main` é protegida por ruleset: toda mudança entra por pull request com os seis checks verdes e o branch atualizado. Testes são separados por sufixo (`*.unit`, `*.int`, `*.e2e`). Consulte `docs/agents/ci.md`.

### Domain docs

O projeto usa layout de contexto único, com glossário em `CONTEXT.md` e decisões arquiteturais em `docs/adr/`. Consulte `docs/agents/domain.md`.

### Memória de desenvolvimento

Aprendizados importantes e reutilizáveis vivem no bundle OKF em `docs/memory/`.

Ao concluir uma tarefa ou investigar um problema, avalie se surgiu um aprendizado capaz de evitar um erro recorrente ou permitir replicar um acerto relevante. Registre-o apenas quando tiver utilidade duradoura e não estiver evidente no código, nas specs, no `CONTEXT.md` ou nos ADRs. O agente decide quando um registro é necessário; quando o usuário disser “grave isso na memória”, o registro é obrigatório.

Não registre ocorrências triviais, detalhes temporários de uma issue, tentativas descartadas sem valor geral ou duplicações da documentação existente. Atualize uma memória existente em vez de criar conteúdo duplicado.

Use `docs/templates/memory-okf.md` como referência. Ao criar ou atualizar uma memória, mantenha `docs/memory/index.md` e `docs/memory/log.md` atualizados. Decisões arquiteturais continuam em `docs/adr/`, termos de domínio em `CONTEXT.md` e requisitos em `specs/`.
