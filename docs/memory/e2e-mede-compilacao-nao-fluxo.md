---
type: Development Learning
title: "E2E em `next dev` cronometra compilação, não o fluxo testado"
description: "O webServer do Playwright em modo dev compila cada rota na primeira visita durante o teste; servir o build de produção cortou 57% da suíte sem trade-off."
tags: [ci, e2e, playwright, nextjs, performance, flakiness]
status: stable
generated:
  by: agente/claude-opus-4-6
  at: 2026-08-12T15:00:00-03:00
sources:
  - id: medicao-e2e-2026-08-12
    resource: "scripts/medir-e2e.sh, playwright.config.ts, .github/workflows/ci.yml, PR #75"
    title: "Medição de três variantes do job E2E do CI"
  - id: schema-estimativa-foto-2026-09-01
    resource: "src/domain/ia/operacoes/refeicao-foto.ts, scripts/servidor-ia-e2e.ts, playwright.config.ts"
    title: "E2E local serviu build anterior depois de mudar o schema da estimativa por foto"
---

# Contexto

O job `E2E mobile` levava ~3m20 e a suspeita natural recaiu sobre o navegador — imagem pesada, browsers demais, viewport. Nada disso: o CI já baixava só o chromium (21 s) num único projeto mobile. Do total, **2,5 min estavam dentro da própria suíte**.[^medicao-e2e-2026-08-12]

O sinal decisivo estava na distribuição dos tempos por teste, não no total: a Triagem marcava 32 s e o offline 11,8 s, enquanto testes já aquecidos fechavam em 1 a 4 s. Tempo concentrado nas *primeiras* visitas a cada rota, não nos fluxos mais longos.

# Aprendizado

`webServer.command: "npm run dev"` faz o Playwright testar contra o compilador, não contra a aplicação. Em `next dev` cada rota é compilada na primeira visita, **com o cronômetro do teste correndo** — o teste mede compilação e a atribui ao fluxo. Por isso o custo aparece espalhado e some quando se olha só o agregado.

Servir o build de produção resolve na origem. Medido com a mesma suíte, servidor sempre frio e `.next` limpo entre rodadas:

| Variante | Tempo | Resultado |
| --- | --- | --- |
| dev, sequencial (baseline) | 120 s | 27/27 |
| dev + 4 workers | 90 s | 23/27 |
| produção servida, sequencial | 52 s | 27/27 |
| produção + 4 workers | 40 s | 26/27 |

Duas conclusões que só a medição sustenta:

1. **Paralelismo aqui é troca ruim.** Compra 12 s adicionais e cobra falha intermitente — os seeds criam usuários distintos, mas os fluxos disputam o mesmo Postgres e o mesmo servidor, e o conjunto que falha muda a cada rodada. Um CI que às vezes reprova o que está certo perde a única função que tem.
2. **O build não precisava ser refeito.** O job `build` já o produzia e descartava; transportá-lo como artefato (74 MB sem `.next/cache`) troca recompilação por download.

Rodar contra produção ainda aproxima o teste do que o usuário recebe, e isso tem efeito imediato no que os seletores enxergam: em produção o Next injeta o route announcer com `role="alert"` vazio, e todo `getByRole("alert")` sem filtro de texto passa a resolver dois elementos.

# Aplicação futura

Antes de otimizar um job de E2E lento, **leia o tempo por teste, não o total**. Se os primeiros testes a tocar cada rota são os lentos e os seguintes são rápidos, o gargalo é compilação sob demanda — trocar o servidor rende mais do que qualquer ajuste de paralelismo ou de imagem.

Ao propor paralelismo, meça também a *estabilidade*, não só o relógio: rode a variante mais de uma vez e compare quais testes falham. Ganho de segundos pago com flakiness é regressão disfarçada de otimização.

Ao escrever asserção sobre `role="alert"` em app Next, filtre por texto (`.filter({ hasText: /\S/ })`): o route announcer é um alerta vazio permanente em produção.

**Localmente, servir produção exige reconstruir depois de mudar o código.** O CI não refaz o build no job E2E porque recebe o artefato novo do job `build`; isso não vale para uma execução manual contra `.next` já existente. Se o mock atualizado responde um schema novo e o app devolve o fallback de indisponibilidade antes de chegar à tela esperada, confira a idade do build antes de diagnosticar o fluxo. Rode `npm run build` e só então `npx playwright test`. No incidente da estimativa por foto, o dublê já devolvia `quantidade + unidade`, mas o bundle antigo ainda validava `quantidadeGramas`; Zod recusava a resposta e os dois testes falhavam sem alcançar a revisão. O mesmo E2E passou sem alteração funcional depois do rebuild.

# Evidência

No CI real, o job caiu de **3m20 para 1m58**, com a execução da suíte em 42,8 s contra os 2,5 min anteriores — mesmos 27 testes, mesmo resultado.[^medicao-e2e-2026-08-12]

O harness `scripts/medir-e2e.sh` reproduz as variantes localmente; `E2E_COMANDO` e `E2E_WORKERS` mantêm o experimento repetível sem tornar nenhuma das variantes o padrão.

[^medicao-e2e-2026-08-12]: Consulte `sources` com id `medicao-e2e-2026-08-12`.
