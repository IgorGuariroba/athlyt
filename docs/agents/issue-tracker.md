# Issue tracker: GitHub

Issues e PRDs deste repositório vivem no GitHub Issues. Use o CLI `gh` em todas as operações e infira o repositório pelo remote Git.

## Convenções

- Criar: `gh issue create --title "..." --body-file <arquivo>`.
- Ler: `gh issue view <número> --comments`.
- Listar: `gh issue list --state open --json number,title,body,labels,comments`.
- Comentar: `gh issue comment <número> --body "..."`.
- Rotular: `gh issue edit <número> --add-label "..."` ou `--remove-label "..."`.
- Fechar: `gh issue close <número> --comment "..."`.

## Pull requests como superfície de triagem

**Não.** Pull requests externos não entram automaticamente na fila de triagem de solicitações.

## Publicação por skills

Quando uma skill disser “publicar no issue tracker”, crie um GitHub Issue neste repositório. Quando disser “buscar o ticket relevante”, leia o issue e seus comentários com `gh issue view`.
