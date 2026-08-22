# AGENTS.md

## Desenvolvimento local

Inicie o projeto com `npm run dev`.

## Galeria de componentes

A referência visual do design system é o Storybook (`npm run storybook`), não
uma rota do produto — a antiga `/design` foi descontinuada.

Todo componente de `src/components/**` precisa de uma story ao lado dele
(`*.stories.tsx`) e, fora da camada `ui`, de teste de contrato.
`npm run ui:verificar` reprova o que faltar, apontando o caminho exato do
arquivo ausente. `npm run storybook:verificar` confere que cada story de fato
renderiza — `storybook build` compila mas não renderiza
(`docs/memory/galeria-compila-mas-nao-renderiza.md`).

## Evidências de testes web

Ao executar testes E2E com Playwright, grave as evidências em `/home/movida/Downloads/evidencias-e2e/`, para facilitar a inspeção manual. Use nomes descritivos e mantenha os artefatos locais fora do versionamento.

## Memória de desenvolvimento

Aprendizados importantes e reutilizáveis vivem no bundle OKF em `docs/memory/`.

Ao concluir uma tarefa ou investigar um problema, avalie se surgiu um aprendizado capaz de evitar um erro recorrente ou permitir replicar um acerto relevante. Registre-o apenas quando tiver utilidade duradoura e não estiver evidente no código, nas specs, no `CONTEXT.md` ou nos ADRs. O agente decide quando um registro é necessário; quando o usuário disser “grave isso na memória”, o registro é obrigatório.

Não registre ocorrências triviais, detalhes temporários de uma issue, tentativas descartadas sem valor geral ou duplicações da documentação existente. Atualize uma memória existente em vez de criar conteúdo duplicado.

Use `docs/templates/memory-okf.md` como referência. Ao criar ou atualizar uma memória, mantenha `docs/memory/index.md` e `docs/memory/log.md` atualizados. Decisões arquiteturais continuam em `docs/adr/`, termos de domínio em `CONTEXT.md` e requisitos em `specs/`.
