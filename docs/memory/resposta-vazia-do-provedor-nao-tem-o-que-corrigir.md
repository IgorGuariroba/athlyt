---
type: Development Learning
title: "Resposta vazia do provedor é transitória e pede repetição, não correção"
description: "NoOutputGeneratedError não traz texto para consertar; o retry simples resolve. E a descrição confusa que parecia culpada foi inocentada por 6/6 sucessos contra o modelo real."
tags: [ia, ai-sdk, resiliencia, diagnostico, producao, hipotese-refutada]
status: stable
generated:
  by: agente/claude-sonnet
  at: 2026-08-30T12:40:00Z
sources:
  - id: log-producao
    resource: "/tmp/athlyt-app.log, 2026-08-30T09:26:15, operação refeicao-texto"
    title: "AI_NoOutputGeneratedError: No output generated."
  - id: sonda
    resource: "sonda descartável contra google/gemini-2.5-flash-lite via OpenRouter"
    title: "6/6 sucessos, com e sem o ruído de transcrição"
  - id: correcao
    resource: src/domain/ia/decidir.ts
    title: "Ramo de retry para NoOutputGeneratedError"
---

# Contexto

O atleta relatou que a estimativa "estava demorando". A tela mostrava
"Estimando…" e o log do servidor trazia, no mesmo minuto:

```
AI_NoOutputGeneratedError: No output generated.
operacao: refeicao-texto   modelo: google/gemini-2.5-flash-lite
```

Não era demora: a chamada tinha terminado em erro. O provedor respondeu
sem conteúdo algum.[^log-producao]

A transcrição usada continha ruído evidente de fala hesitante — "Comi
uma um pão de sal. **Nossa, essa tão?** Uma fatia de mussarela…" — e a
hipótese imediata foi que a entrada confusa fazia o modelo desistir do
`structured_outputs`.

# Aprendizado

## A hipótese plausível estava errada

Uma sonda contra o modelo real, com o texto exato do caso e o mesmo
schema, deu **6/6 sucessos** — três execuções com o ruído e três sem
ele.[^sonda] O ruído não tem efeito algum; a falha é transitória do
provedor.

O custo de não ter testado seria alto e invisível: eu estava prestes a
orientar o usuário a "editar a transcrição para remover o ruído", o que
teria funcionado por coincidência na tentativa seguinte — e gravado no
produto uma superstição sobre o que faz a estimativa falhar.

Toda hipótese sobre comportamento de modelo é barata de testar
(uma sonda descartável, segundos, centavos) e cara de assumir.

## As três falhas do executor são diferentes

`decidir()` já tratava duas, e a terceira caía no `throw`:

| Erro | O que voltou | Remédio |
|---|---|---|
| `NoObjectGeneratedError` + "did not match schema" | texto com objeto inválido | reprompt citando as violações |
| "invalid json response" | texto quebrado | repetir |
| `NoOutputGeneratedError` | **nada** | repetir |

O discriminador é *o que veio de volta*. Só faz sentido corrigir o
prompt quando há saída para apontar como errada; sem texto nenhum, o
reprompt não teria o que citar, e a mesma pergunta refeita costuma ser
respondida.

# Aplicação futura

Ao ver `NoOutputGeneratedError` em log de IA, não procure causa na
entrada antes de verificar se ela reproduz. Rode a mesma entrada 3× ou
mais contra o modelo real: se passar, a causa é o provedor, e o remédio
é resiliência, não engenharia de prompt.

Ao adicionar tratamento de erro no executor, classifique pelo que o
provedor devolveu, não pelo nome da exceção. `AISDKError` tem muitas
subclasses cujo remédio é o mesmo e outras cujo nome parece igual e o
remédio difere.

Ao propor ao usuário uma mudança de comportamento ("edite o texto",
"evite tal palavra"), verifique a hipótese antes de enunciá-la. Conselho
errado sobre modelo vira crença duradoura, porque a próxima tentativa
quase sempre funciona — pelo motivo errado.

# Evidência

Sonda com o texto exato do caso real, três execuções de cada
variante:[^sonda]

```
com ruido (caso real) [1] -> OK (4 itens)
com ruido (caso real) [2] -> OK (4 itens)
com ruido (caso real) [3] -> OK (4 itens)
sem ruido             [1] -> OK (4 itens)
sem ruido             [2] -> OK (4 itens)
sem ruido             [3] -> OK (4 itens)
```

Descartados antes, também com medição: rede e OpenRouter respondendo em
131 ms; `.env` presente e carregado pelo `next-server` do standalone; o
timeout de 240 s nem alcançado.

Os dois testes do retry foram verificados nos dois sentidos — neutralizado
o ramo novo, ambos falham:

```
× repete uma vez quando o provedor devolve resposta vazia
× desiste quando a resposta vazia se repete, em vez de insistir
```

[^log-producao]: `/tmp/athlyt-app.log`, 2026-08-30T09:26:15.
[^sonda]: Sonda descartável contra `google/gemini-2.5-flash-lite` via OpenRouter, removida após o diagnóstico.
[^correcao]: `src/domain/ia/decidir.ts`, ramo `NoOutputGeneratedError.isInstance(erro)`.
