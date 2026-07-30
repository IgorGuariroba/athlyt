---
okf_version: "0.2"
---

# Memória de desenvolvimento

- [npm ci exige lock gerado pela mesma versão de npm do runner](ci-lockfile-npm-runner.md) — regenerar `package-lock.json` com um npm diferente do usado no CI não corrige `EUSAGE`; é preciso casar a versão e fixar o patch do Node. `[ci, dependencias, npm]`
- [Mudança de UI atualiza o E2E no mesmo conjunto](mudanca-ui-atualiza-e2e.md) — alterações de interação ou contrato acessível exigem atualizar e executar o cenário E2E equivalente antes do push. `[ui, e2e, acessibilidade, playwright]`
- [Após o merge, sincronizar main e remover a branch concluída](limpeza-pos-merge.md) — encerrar cada PR com a `main` local atualizada e as branches de trabalho local e remota removidas. `[git, github, workflow, branches]`
