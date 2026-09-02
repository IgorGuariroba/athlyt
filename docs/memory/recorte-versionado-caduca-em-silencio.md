---
type: Development Learning
title: "Recorte versionado caduca o consentimento em silêncio e degrada a decisão sem sinal"
description: "Subir a versão de um Recorte de Contexto invalida o consentimento já dado; se o código não distingue 'defasado' de 'nunca consentiu', a IA passa a decidir sem os dados e ninguém percebe."
tags: [ia, consentimento, contexto-do-atleta, privacidade, degradacao, diagnostico]
status: stable
generated:
  by: agente/claude-code
  at: 2026-08-14T18:15:00Z
sources:
  - id: consentimento
    resource: src/domain/ia/consentimento.ts
    title: "classificarConsentimentos e estadoConsentimento"
  - id: trilha
    resource: "psql: decision_trail WHERE operacao='plano-inicial'"
    title: "Trilha de Decisão com recorte_versao=2 e campos do Núcleo apenas"
  - id: modalidades
    resource: scripts/verificar-modalidades.ts
    title: "Confere modalidades do Recorte contra o catálogo do OpenRouter"
---

# Contexto

Ao auditar o que era enviado ao agent na operação `plano-inicial`, a Trilha de
Decisão mostrou planos gerados apenas com o Núcleo — sem circunferências, sem
metas de proporção, sem fotos. Nenhum erro havia sido registrado: `degradado`
era `false` e `campos_omitidos` estava vazio.

A causa era a evolução do Recorte. `RECORTES["plano-inicial"].versao` subira de
2 para 4 (deduplicação de contexto e envio de fotos), enquanto o consentimento
do usuário continuava gravado em `recorte_versao = 2`. `consentimentosVigentes`
filtrava por igualdade de versão e devolvia lista vazia — indistinguível de
"nunca consentiu". A partir daí `montarContexto` omitia todos os campos
sensíveis e o plano saía cego.

# Aprendizado

Amarrar consentimento à versão do Recorte está correto: se muda o que é
enviado, o "sim" anterior não cobre o envio novo. O erro é o tipo de retorno.
Uma lista de ids consentidos colapsa dois estados que exigem respostas opostas:

- **nunca consentiu** — pedir consentimento pela primeira vez;
- **consentiu numa versão anterior** — pedir reconfirmação do que mudou.

Colapsados, o segundo vira o primeiro e o sistema degrada em silêncio, violando
a regra de não-substituição silenciosa documentada no comentário de
`montarContexto` em `src/domain/ia/contexto/montagem.ts` justamente no caminho
que ela existe para proteger.
Pior: `campos_omitidos` fica vazio na Trilha, porque a versão antiga do Recorte
nem declarava os campos novos — a auditoria não denuncia a perda.

O mesmo acoplamento cria uma segunda armadilha, um nível abaixo. Recorte e mapa
de modelos evoluem separadamente: quando um Recorte passa a declarar campo de
imagem, nada verifica se o modelo daquela operação aceita imagem. O OpenRouter
recusa com `No endpoints found that support image input`, e o erro só aparece
em execução real. Manter catálogo de modelos diferente entre dev e produção
agrava isso — a incompatibilidade existe num ambiente e não no outro.

# Aplicação futura

Ao subir a `versao` de um Recorte em `src/domain/ia/contexto/recortes.ts`:

1. Trate consentimento defasado como estado próprio. `estadoConsentimento`
   retorna `vigentes`, `defasados`, `ausentes` e `precisaReconsentir`; use
   `precisaReconsentir` para pedir reconfirmação em vez de gerar a decisão.
2. Nunca decida com contexto degradado sem declarar ao usuário. Bloquear e
   pedir reconfirmação é melhor que entregar um plano pior sem causa visível.
3. Rode `npm run ia:modalidades` — ele compara os campos de imagem de cada
   Recorte com `input_modalities` do modelo daquela operação no catálogo.
4. Ao investigar "a IA está decidindo mal", leia `decision_trail`
   (`recorte_versao`, `campos_enviados`, `prompt_enviado`) antes de suspeitar do
   prompt ou do modelo. `campos_enviados` contendo só nomes do Núcleo é a
   assinatura deste bug.
5. Para inspecionar o prompt real sem gastar chamada, use
   `npx tsx scripts/inspecionar-prompt-plano.ts <userId> [--consentir-tudo]`.

# Evidência

Trilha anterior à correção, com o Recorte já em v4 e consentimento em v2 —
`campos_enviados` lista apenas campos do Núcleo, e `degradado` é `false`[^trilha]:

```
recorte_versao | campos_enviados                                  | degradado
2              | alturaCm, dataNascimento, diasDisponiveis, ...   | f
```

Após a correção e o reconsentimento, a mesma operação envia o Recorte
declarado, e o plano gerado lista `linha-base-corporal` e `metas-proporcao` em
`dadosUsados`:

```
recorte_versao | campos_enviados                                            | degradado
4              | triagem-completa, fotos-corporais, linha-base-corporal,    | f
               | metas-proporcao, historico-importado
```

`classificarConsentimentos` isola a regra do banco, tornando testável o caso em
que o recorte sobe de versão sob um consentimento existente[^consentimento]. A
verificação de modalidades apontou a incompatibilidade de `plano-inicial` antes
de qualquer chamada paga[^modalidades].

[^trilha]: Consulta à `decision_trail` do banco de desenvolvimento, 2026-08-14.
[^consentimento]: `src/domain/ia/__tests__/consentimento.unit.test.ts`.
[^modalidades]: `npm run ia:modalidades`.
