---
name: subir-git
description: "Use quando o usuário pedir a sequência completa de entrega: commit, push, CI, correção de falhas e merge."
---

# Subir Git

Execute a sequência em ordem e só avance após o critério de conclusão de cada etapa:

1. **Estado** — confira branch, diff e arquivos não relacionados. Não inclua alterações pré-existentes do usuário. Concluído quando o commit contém somente o escopo pedido.
2. **Commit** — rode os testes relevantes, crie um commit atômico e registre o SHA. Concluído quando o working tree estiver limpo, exceto alterações pré-existentes preservadas.
3. **Push** — publique a branch no remoto e confirme que o SHA remoto corresponde ao local.
4. **Pull request** — crie ou localize o PR contra a branch padrão e registre a URL e o número.
5. **CI** — acompanhe os checks do PR até estado terminal. Se falhar, leia os logs, corrija a causa, rode a validação local, faça novo commit/push e volte a acompanhar desde o início.
6. **Merge** — somente faça merge quando todos os checks obrigatórios estiverem aprovados. Após o merge, confirme o estado do PR e o SHA da branch padrão.
7. **Limpeza** — atualize a branch padrão local, remova a branch de trabalho quando seguro e reporte evidências: commit, PR, checks e merge.

Use `gh` para PRs e Actions. Não marque a entrega como concluída enquanto o CI estiver pendente, falho ou sem confirmação do merge.
