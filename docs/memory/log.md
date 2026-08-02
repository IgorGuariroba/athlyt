# Histórico da memória

## 2026-07-30

- Criada [rebuild-restart-apos-mudanca.md](rebuild-restart-apos-mudanca.md): a aplicação acessada pelo Tailscale Funnel roda como build de produção; registrado que toda mudança deve terminar com `npm run build` e reinício por `npm start` na porta 3000. Fonte: instrução do responsável pelo ambiente.
- Criada [ci-lockfile-npm-runner.md](ci-lockfile-npm-runner.md): `npm ci` falhou em todos os jobs na primeira execução real do CI, e a correção do lock feita com o npm local não surtiu efeito porque o runner usa outra versão. Registrada por ser um erro caro de diagnosticar e fácil de repetir. Fonte: PR #35.
- Criada [mudanca-ui-atualiza-e2e.md](mudanca-ui-atualiza-e2e.md): o redesenho das etapas de peso e objetivo alterou o contrato acessível sem atualizar a jornada E2E, que falhou procurando os controles antigos. Registrada para que futuras mudanças de UI incluam a manutenção e execução dos testes afetados no mesmo conjunto. Fonte: PR #38.
- Criada [e2e-auth-url-local.md](e2e-auth-url-local.md): ao validar as réguas de altura e peso, os cenários E2E autenticados falhavam na primeira asserção por redirecionamento à raiz. A causa era o `AUTH_URL` do `.env` apontando para o Tailscale, que faz o Auth.js exigir cookie `__Secure-` incompatível com o helper de seed em HTTP. Registrada por levar a suspeitar do componente errado. Fonte: sessão de validação da roleta.
- Criada [limpeza-pos-merge.md](limpeza-pos-merge.md): após o merge do PR #38, o repositório local permaneceu na branch concluída e com a `main` desatualizada. Registrado o encerramento obrigatório do ciclo com sincronização por avanço rápido e remoção segura das branches local e remota. Fonte: PR #38.

## 2026-08-01

- Criada [estado-offline-fora-do-react.md](estado-offline-fora-do-react.md): ao implementar o outbox offline (issue #21), três reescritas sucessivas não satisfizeram `react-hooks/set-state-in-effect` porque o modelo estava errado — a fila em IndexedDB e a conectividade não são estado do componente. Registrada porque o mesmo padrão vai reaparecer no Diário e no Check-in, e porque a janela de inconsistência é invisível em teste manual. Fonte: issue #21.
- Criada [persistencia-visivel-apos-retorno.md](persistencia-visivel-apos-retorno.md): terceira ocorrência do relato "não persistiu" — depois de dois casos na triagem (#49 e #50), o cartão "Treino do dia" do Início voltou a oferecer o treino recém-concluído. Registrada porque as três causas são distintas (escrita, invalidação e derivação) e o padrão comum é o teste terminar na tela de sucesso sem voltar por navegação real ao ponto de partida. Fontes: commits 5f0ed54, 2c5eefd e 29f0d78.

## 2026-08-02

- Criada [aritmetica-de-dias-locais.md](aritmetica-de-dias-locais.md): ao validar manualmente a persistência do Diário (issue #22), o botão "Dia anterior" saltou de 02/08 para 31/07 — a folga de ±26h somada à meia-noite local para absorver horário de verão atravessava a fronteira do dia anterior. Registrada porque a mesma aritmética reaparece em Check-in, Cadência Adaptativa, Revisão Semanal e Progresso, e porque 238 testes verdes não pegaram o defeito: nenhum deles andava entre dias. Fonte: PR #57.
