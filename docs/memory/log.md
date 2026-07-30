# Histórico da memória

## 2026-07-30

- Criada [ci-lockfile-npm-runner.md](ci-lockfile-npm-runner.md): `npm ci` falhou em todos os jobs na primeira execução real do CI, e a correção do lock feita com o npm local não surtiu efeito porque o runner usa outra versão. Registrada por ser um erro caro de diagnosticar e fácil de repetir. Fonte: PR #35.
