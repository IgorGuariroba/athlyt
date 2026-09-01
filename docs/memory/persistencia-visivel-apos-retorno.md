---
type: Development Learning
title: "Persistir não é o mesmo que voltar e ver"
description: "Todo fluxo que grava estado precisa de um teste de ida e volta pela navegação real; três bugs distintos de \"não persistiu\" tinham a gravação correta e a releitura errada."
tags: [nextjs, app-router, cache, server-actions, e2e, persistencia]
status: stable
generated:
  by: agente/claude-opus-4-6
  at: 2026-08-01T12:05:00-03:00
sources:
  - id: pr-49
    resource: "commit 5f0ed54 — fix(triagem): invalida cascata após persistir respostas (#49)"
    title: "Equipamento personalizado sumia ao voltar na cascata"
  - id: pr-50
    resource: "commit 2c5eefd — fix(triagem): persiste equipamento livre ao cadastrar (#50)"
    title: "Cadastro vivia só no estado React até o submit"
  - id: inicio-treino
    resource: "commit 29f0d78 — fix(inicio): reflete o treino já realizado no cartão do dia"
    title: "Início reoferecia o treino recém-concluído"
---

# Contexto

Três relatos do usuário com o mesmo enunciado — "alterei/fiz e não persistiu" — tiveram três causas técnicas diferentes, e em nenhuma delas o banco estava errado:

1. A gravação acontecia, mas o App Router remontava a etapa com o payload RSC anterior ao submit.[^pr-49]
2. A gravação não acontecia: o dado vivia no estado React até um submit que a navegação cancelava.[^pr-50]
3. A gravação acontecia e o cache estava correto, mas a leitura ignorava o estado persistido — o cartão "Treino do dia" renderizava `bloco.dias[0]` fixo e nunca consultava o histórico de sessões.[^inicio-treino]

Nos três casos os testes existentes passavam, porque terminavam na tela de sucesso em vez de voltar ao ponto de partida.

# Aprendizado

"Não persistiu" é um sintoma do usuário, não um diagnóstico. Ele tem três causas possíveis, e é preciso separá-las antes de corrigir:

- **Escrita** — a ação chegou a gravar? Estado que só existe no cliente até um submit é perdido por qualquer navegação.
- **Invalidação** — a leitura seguinte vê a gravação? Uma Server Action que grava e redireciona sem `revalidatePath` deixa o App Router reapresentar o payload anterior.
- **Derivação** — a tela lê o estado persistido, ou uma constante? Índice fixo, primeiro item de lista e valor padrão parecem corretos enquanto não há histórico, e passam a mentir exatamente quando o usuário faz algo.

A causa 3 é a mais cara: não há erro, cache nem exceção; a tela simplesmente responde à pergunta errada. O sinal é sempre o mesmo — a interface exibe algo que não é função do dado gravado.

A raiz comum do lado do teste é que a cobertura acompanhava o caminho de ida (formulário → sucesso) e nunca o de volta. O usuário reclama justamente da volta.

# Aplicação futura

Ao implementar ou revisar qualquer fluxo que grave estado:

1. **Feche o ciclo no teste.** O cenário só termina depois de sair da tela e **voltar por navegação real** (link Voltar, aba, `goto` da rota de origem) e afirmar o estado gravado. Terminar na tela de sucesso não cobre a queixa do usuário.
2. **Revalide o que a gravação afeta, não só a rota atual.** Liste as rotas que leem esse dado — inclusive `/inicio` e outras abas — e chame `revalidatePath` para cada uma antes do `redirect`.
3. **Toda operação que o usuário percebe como "salvei" grava sozinha.** Se ele pode navegar antes do submit, a operação precisa da própria Server Action.
4. **Desconfie de índice fixo e valor padrão em tela que reflete progresso.** `dias[0]`, `[0]`, `?? primeiro` numa superfície que deveria mudar depois de uma ação é o formato típico deste bug; derive do estado persistido e cubra a regra com teste unitário.
5. **Ao receber "não persistiu", classifique antes de corrigir**: consulte o banco. Dado gravado e tela errada isola o problema em invalidação ou derivação — e a distinção entre as duas é se a tela consulta esse dado.

# Evidência

No incidente do Início, a sessão estava no banco com `estado = "concluida"` e o cartão continuava oferecendo o mesmo treino: a página nunca chamava `listarHistoricoSessoes`. A correção derivou o cartão do histórico e acrescentou `revalidatePath("/inicio")` às ações de iniciar, concluir e abandonar. O E2E foi estendido para voltar ao Início após concluir — falhava antes da correção e passou depois, que é a prova que faltava nos dois incidentes anteriores da triagem.[^inicio-treino]

[^pr-49]: Fonte `pr-49`.
[^pr-50]: Fonte `pr-50`.
[^inicio-treino]: Fonte `inicio-treino`.
