---
okf_version: "0.2"
---

# Memória de desenvolvimento

- [npm ci exige lock gerado pela mesma versão de npm do runner](ci-lockfile-npm-runner.md) — regenerar `package-lock.json` com um npm diferente do usado no CI não corrige `EUSAGE`; é preciso casar a versão e fixar o patch do Node. `[ci, dependencias, npm]`
