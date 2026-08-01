---
okf_version: "0.2"
---

# Memória de desenvolvimento

- [Após mudanças, reconstruir e reiniciar a aplicação em produção](rebuild-restart-apos-mudanca.md) — a URL do Tailscale Funnel serve o Next.js em modo produção; toda mudança exige novo build e reinício do processo na porta 3000. `[deploy, nextjs, tailscale, producao]`
- [npm ci exige lock gerado pela mesma versão de npm do runner](ci-lockfile-npm-runner.md) — regenerar `package-lock.json` com um npm diferente do usado no CI não corrige `EUSAGE`; é preciso casar a versão e fixar o patch do Node. `[ci, dependencias, npm]`
- [Mudança de UI atualiza o E2E no mesmo conjunto](mudanca-ui-atualiza-e2e.md) — alterações de interação ou contrato acessível exigem atualizar e executar o cenário E2E equivalente antes do push. `[ui, e2e, acessibilidade, playwright]`
- [E2E local exige AUTH_URL apontando para o host de teste](e2e-auth-url-local.md) — com o `AUTH_URL` do Tailscale, o Auth.js exige cookie `__Secure-` e todo cenário E2E autenticado é redirecionado à raiz; suba o servidor com o host e a porta do teste. `[e2e, autenticacao, playwright, nextauth, ambiente]`
- [Persistir não é o mesmo que voltar e ver](persistencia-visivel-apos-retorno.md) — "não persistiu" tem três causas (escrita, invalidação, derivação); feche o ciclo do teste voltando por navegação real ao ponto de partida. `[nextjs, app-router, cache, server-actions, e2e, persistencia]`
- [Após o merge, sincronizar main e remover a branch concluída](limpeza-pos-merge.md) — encerrar cada PR com a `main` local atualizada e as branches de trabalho local e remota removidas. `[git, github, workflow, branches]`
