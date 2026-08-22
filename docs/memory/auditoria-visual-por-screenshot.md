---
type: Development Learning
title: "Desvio de design system se mede por screenshot de todas as telas, não por leitura de código"
description: "Um script que semeia sessão e captura cada rota revela padrões divergentes que a leitura arquivo a arquivo não expõe, e transforma 'parecer com a referência' em lista finita de correções."
tags: [design-system, ui, auditoria, playwright, screenshot, refatoracao]
status: stable
generated:
  by: agente/claude-opus-4-1
  at: 2026-08-13T21:20:00-03:00
sources:
  - id: auditoria-macrofactor-2026-08-13
    resource: "scripts/auditoria-visual.ts, src/components/tela/, evidencias-e2e/auditoria/"
    title: "Auditoria das 44 telas contra as referências do MacroFactor"
---

# Contexto

O pedido era garantir que toda a aplicação usasse componentes parecidos com os do MacroFactor e que tudo estivesse mapeado na galeria de design. A tentação inicial é abrir os arquivos e procurar classes suspeitas. Isso encontra sujeira local, mas não responde a pergunta de verdade: *esta tela se parece com a referência?*[^auditoria-macrofactor-2026-08-13]

# Aprendizado

**Renderize antes de julgar.** Um script que semeia sessão autenticada e captura `fullPage` de cada rota (`scripts/auditoria-visual.ts`) produziu, em uma execução, o inventário completo do desvio. Três defeitos sistêmicos só ficaram evidentes na imagem:

1. `<select>` e `<progress>` nativos — no código parecem inofensivos; renderizados em interface dark-first, aparecem com a seta e o azul do sistema operacional, denunciando "formulário web" no meio de um app móvel.
2. Um cartão por destino na tela "Mais" — no JSX é repetição banal; na tela, triplica a altura e transforma navegação em ação. A referência (`147-mais-configuracoes.JPG`) usa **um** cartão com linhas divididas.
3. Estado vazio como frase `muted` dentro de um cartão — indistinguível de conteúdo carregando, e sem próxima ação.

**Uma métrica barata prioriza o trabalho.** Contar quantas páginas importam do kit de composição (`grep -L TelaConteudo`) separou em segundos a triagem — que já usava o kit — do casco autenticado, que não usava. O desvio não era uniforme.

**A correção pertence ao componente.** Cada defeito virou um componente novo em `src/components/tela/` (`CampoSelecao`, `ListaNavegacao`, `EstadoVazio`, `MedidorScore`, `PainelMetricas`, `GradeSelecaoFoto`, `ControleFaixa`), não um conserto na página. Assim a próxima tela nasce correta, e o `grep '<select'` retornando zero vira invariante verificável.

# Aplicação futura

Ao receber um pedido de conformidade visual ampla:

1. Escreva o script de captura antes de editar qualquer tela. Reaproveite `scripts/auditoria-visual.ts` — a lista de rotas é o único trecho que muda.
2. Suba o servidor com `AUTH_URL` casando o host, senão todas as rotas autenticadas redirecionam para `/` e as capturas saem idênticas (ver `e2e-auth-url-local.md`).
3. Compare cada captura com a referência correspondente em `workflow-imagens-references/macrofactor/` antes de decidir o que mudar.
4. Extraia o padrão divergente para um componente, demonstre-o em uma story ao lado dele (`*.stories.tsx`, visível em `npm run storybook`) e só então aplique nas telas.

Métricas úteis como porta de saída: `grep -rn '<select\|<progress' src/app` deve retornar zero, e toda página deve importar de `@/components/tela`.

# Evidência

A auditoria capturou 44 telas em uma execução. As capturas revelaram `<select>` nativo em 7 arquivos e `<progress>` cru no scorecard — ambos invisíveis em revisão de código por parecerem HTML correto. Após a extração dos componentes, `grep -rn '<select' src/app` passou de 7 para 0 ocorrências, e a tela "Mais" saiu de quatro cartões empilhados para uma `ListaNavegacao` equivalente ao padrão da referência.[^auditoria-macrofactor-2026-08-13]

[^auditoria-macrofactor-2026-08-13]: Consulte `sources` com id `auditoria-macrofactor-2026-08-13`.
