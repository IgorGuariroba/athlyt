---
type: Development Learning
title: "Token de tipografia customizado precisa ser ensinado ao tailwind-merge"
description: "O tailwind-merge classifica `text-label-lg` como cor e descarta silenciosamente a cor real da classe; e classe de escala inexistente cai no tamanho padrão sem erro algum."
tags: [design-system, tailwind, tipografia, cn, ui]
status: stable
generated:
  by: agente/claude-sonnet-4-5
  at: 2026-08-07T15:20:00-03:00
sources:
  - id: progresso-macrofactor-2026-08-07
    resource: "src/lib/utils.ts, src/components/tela/__tests__/tela.unit.test.tsx, src/app/(app)/progresso/page.tsx"
    title: "Revisão da tela de Progresso contra o MacroFactor Visual System"
---

# Contexto

A tela de Progresso não parecia seguir o DESIGN.md mesmo usando classes que existem no vocabulário do projeto. Dois defeitos independentes explicavam quase toda a divergência, e nenhum dos dois produz erro de build, de lint ou de tipo.[^progresso-macrofactor-2026-08-07]

# Aprendizado

**1. Classe de escala inexistente falha em silêncio.** `text-title-lg` não é um token declarado em `globals.css`. O Tailwind simplesmente não gera regra, o elemento herda 16px, e o resultado é um `h2` menor que o `body` ao redor — indistinguível de uma escolha deliberada em revisão de código. Só a comparação de `getComputedStyle` com a escala de DESIGN.md revela.

**2. O `cn` descarta cor ao encontrar um token de tipografia.** O `tailwind-merge` não lê o CSS do projeto: ele resolve `text-*` por heurística e trata `text-label-lg` como cor de texto. Ao mesclar `text-primary-foreground` com `text-label-lg` na mesma chamada, um dos dois é removido. Foi assim que o CTA branco ficou com texto quase branco — invisível em revisão de diff, óbvio no aparelho.

A correção pertence ao `cn`, não às páginas: qualquer variante de componente que combine cor e tamanho tipográfico do sistema reproduz o defeito.

# Aplicação futura

Ao adicionar um token à escala de `globals.css`, adicione-o também ao grupo `font-size` do `extendTailwindMerge` em `src/lib/utils.ts` — as duas listas precisam andar juntas.

Ao suspeitar de divergência visual em uma tela, confirme a escala aplicada de fato antes de reescrever o layout:

```bash
playwright-cli --raw eval "(() => JSON.stringify([...document.querySelectorAll('h1,h2')].map(e => ({t: e.textContent.slice(0,20), fs: getComputedStyle(e).fontSize}))))()"
```

Um `h2` renderizando 16px indica classe fora do tema, não decisão de design.

# Evidência

Antes da correção, `Metas de Proporção Corporal` (`text-title-lg`) computava `font-size: 16px`, contra os 18px de `title` em DESIGN.md. O CTA "Iniciar ou revisar" computava `color: rgb(242,242,242)` sobre `background: rgb(255,255,255)`; após ensinar a escala ao `tailwind-merge`, passou a `rgb(17,17,17)` sobre o mesmo fundo. Ambos os comportamentos estão cobertos por teste unitário em `tela.unit.test.tsx` (`describe("cn")`).[^progresso-macrofactor-2026-08-07]

[^progresso-macrofactor-2026-08-07]: Consulte `sources` com id `progresso-macrofactor-2026-08-07`.
