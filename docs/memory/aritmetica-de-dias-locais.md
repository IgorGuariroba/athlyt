---
type: Development Learning
title: "Aritmética de dias locais ancora no meio-dia, não na meia-noite"
description: "Somar ±26h à meia-noite local para absorver horário de verão pula um dia inteiro; a âncora segura é o meio-dia. O bug só apareceu na navegação manual porque o E2E não andava entre dias."
tags: [fuso-horario, datas, diario, e2e, validacao]
status: stable
generated:
  by: agente/claude-opus-4-6
  at: 2026-08-02T10:45:00-03:00
sources:
  - id: issue-22
    resource: "PR #57 — feat(diario): linha do tempo, Entradas Planejadas e macros do dia (#22)"
    title: "Dia anterior do Diário saltava de 02/08 para 31/07"
---

# Contexto

O Diário navega entre dias alimentares, e o dia é derivado do fuso do atleta (`src/domain/diario/dia-alimentar.ts`). Para andar um dia, a primeira versão partia da meia-noite local (`intervaloUtcDoDia(...).inicio`) e somava `±26h` — a folga de 2h existia para absorver transições de horário de verão.

Partindo de 00:00, subtrair 26h aterrissa às 22:00 de **dois** dias antes. O botão "Dia anterior" pulava 01/08 e ia direto de 02/08 para 31/07: um dia inteiro de refeições ficava inalcançável pela interface, embora persistido corretamente no banco.[^issue-22]

# Aprendizado

Ao andar entre dias locais, **ancore no meio-dia**, não na meia-noite. O meio-dia deixa 12 horas de margem para cada lado — muito mais do que qualquer transição de fuso exige — enquanto a meia-noite fica a zero distância da fronteira, de modo que qualquer folga adicionada para "ser seguro" atravessa a fronteira anterior.

```ts
// errado: 00:00 − 26h cai no dia retrasado
const alvo = new Date(inicioDoDia.getTime() + passo * 26 * 3600_000);
// certo: 12:00 ± 24h permanece no dia vizinho
const alvo = new Date(instanteDeHoraLocal(dia, "12:00", fuso).getTime() + passo * 86_400_000);
```

A margem de segurança contra horário de verão só é segura longe da fronteira que ela pretende proteger.

O bug sobreviveu a 226 testes unitários/integração e 12 E2E verdes porque **nenhum teste andava entre dias**: os cenários fixavam `dia` explicitamente. Uma função de navegação sem teste de ida e volta é uma função sem teste.

# Aplicação futura

1. **Toda aritmética de data local usa o meio-dia como âncora.** Vale para o Diário, e valerá para Check-in Diário, Cadência Adaptativa, Revisão Semanal e gráficos do Progresso — todos andam em dias.
2. **Cubra navegação com ida e volta.** `diaVizinho(d, -1)` seguido de `diaVizinho(_, +1)` tem de retornar `d`, e iterando dezenas de passos sobre fusos com horário de verão (`America/Sao_Paulo`, `America/New_York`). Um passo que pula uma data esconde dados sem lançar erro.
3. **Ao validar visualmente uma correção, confirme que o processo servindo a página é o novo.** Durante esta investigação, dois screenshots seguidos mostraram o bug já corrigido: o servidor continuava servindo o build anterior. `lsof -ti:PORTA` devolveu o PID errado (pegou o Chrome); o PID confiável veio de `ss -ltnp | grep :PORTA`, e a checagem barata é `curl` na rota e inspecionar o HTML, que não depende do cache do Router nem do navegador.

# Evidência

Sintoma reproduzido no navegador contra o build de produção: cabeçalho "Ontem — 2026-07-31" a partir de 2026-08-02. Após a correção, o HTML servido passou a conter `dia=2026-08-01` e `dia=2026-08-03`, e a navegação de ida e volta retornou ao dia de origem com os consumos confirmados intactos. Cobertura acrescentada: dois casos unitários (vizinhos exatos e 60 passos de ida e volta em três fusos) e uma etapa no `diario.e2e`.[^issue-22]

[^issue-22]: Fonte `issue-22`.
