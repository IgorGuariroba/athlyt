# Histórico da memória

## 2026-07-30

- Criada [ci-lockfile-npm-runner.md](ci-lockfile-npm-runner.md): `npm ci` falhou em todos os jobs na primeira execução real do CI, e a correção do lock feita com o npm local não surtiu efeito porque o runner usa outra versão. Registrada por ser um erro caro de diagnosticar e fácil de repetir. Fonte: PR #35.
- Criada [mudanca-ui-atualiza-e2e.md](mudanca-ui-atualiza-e2e.md): o redesenho das etapas de peso e objetivo alterou o contrato acessível sem atualizar a jornada E2E, que falhou procurando os controles antigos. Registrada para que futuras mudanças de UI incluam a manutenção e execução dos testes afetados no mesmo conjunto. Fonte: PR #38.
- Criada [limpeza-pos-merge.md](limpeza-pos-merge.md): após o merge do PR #38, o repositório local permaneceu na branch concluída e com a `main` desatualizada. Registrado o encerramento obrigatório do ciclo com sincronização por avanço rápido e remoção segura das branches local e remota. Fonte: PR #38.
