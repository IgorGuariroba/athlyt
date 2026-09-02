---
name: arch-diagnostic-spec
description: "Diagnostica a arquitetura do repositório athlyt sem supervisão, elege UM único achado crítico e publica uma spec de implementação como issue no GitHub — só quando o achado é novo. Use em execuções agendadas de diagnóstico de código, ou quando o pedido for \"achar o problema arquitetural mais importante e virar spec\"."
---

# Diagnóstico de Arquitetura → Spec

Encontrar **um** ponto de fricção arquitetural que valha o esforço de corrigir, e entregá-lo como spec pronta para implementação numa issue do GitHub.

Adaptada de `improve-codebase-architecture`, `codebase-design` e `to-spec` (mattpocock/skills) para rodar **sem ninguém na frente**, e calibrada para o repositório **IgorGuariroba/athlyt**.

## Regra zero: nunca pergunte

Esta skill costuma rodar agendada, sem humano presente. Portanto:

- **Nunca** faça uma pergunta e espere resposta. Se faltar informação, decida e registre a decisão na seção "Premissas assumidas" da issue.
- **Nunca** abra navegador, `xdg-open`, `open` ou `start`.
- **Nunca** commite, faça push, abra PR ou altere qualquer arquivo do repositório. O único efeito colateral permitido é **criar uma issue**.
- Ao final, sempre reporte em uma linha o que aconteceu: issue criada (com link), ou por que nenhuma foi criada.

## Preparo: garanta o histórico

O passo 1 depende de `git log`. Um clone raso o inutiliza — com `--depth 1` o log tem um commit só e a análise de hot spots vira chute.

Como esta skill costuma rodar dentro de uma routine, que clona o repositório por conta própria, **a primeira coisa a fazer é conferir o que você recebeu**:

```bash
git log --oneline | wc -l
```

Menos de ~50 commits significa clone raso. Nesse caso, aprofunde antes de analisar:

```bash
git fetch --unshallow 2>/dev/null || git fetch --depth=300
```

Se o repositório precisar ser clonado do zero, use `git clone --filter=blob:none https://github.com/IgorGuariroba/athlyt.git` — **nunca** `--depth 1`.

Se, depois de tentar aprofundar, o log continuar raso, **pare e reporte isso** em vez de produzir um diagnóstico sem base. Hot spot inventado é pior que nenhum.

## Vocabulário obrigatório

Use estes termos com precisão, **em inglês**, mesmo escrevendo em português. Não substitua por "componente", "serviço", "API" ou "boundary" — a consistência de linguagem é o ponto.

- **Module**: qualquer coisa com interface e implementação. Escala-agnóstico: função, classe, pacote ou fatia que atravessa camadas.
- **Interface**: tudo que um chamador precisa saber para usar o module corretamente — assinatura, invariantes, ordem de chamadas, modos de erro, configuração exigida, características de performance. É mais amplo que a assinatura de tipos.
- **Depth**: alavancagem na interface. Quanto comportamento um chamador (ou teste) exercita por unidade de interface que precisa aprender. **Deep** = muito comportamento atrás de interface pequena. **Shallow** = interface quase tão complexa quanto a implementação.
- **Seam**: lugar onde se altera comportamento sem editar naquele lugar; a *localização* da interface de um module.
- **Adapter**: coisa concreta que satisfaz uma interface num seam. Descreve papel, não substância.
- **Leverage**: o que os chamadores ganham com depth — mais capacidade por unidade de interface aprendida.
- **Locality**: o que os mantenedores ganham com depth — mudança, bugs e verificação concentrados num lugar só.

Princípios que decidem a análise:

- **Teste da deleção.** Imagine deletar o module. Se a complexidade *some*, era pass-through. Se *reaparece espalhada por N chamadores*, ele estava pagando seu preço. "Reaparece concentrada" é o sinal que você procura.
- **A interface é a superfície de teste.** Se você precisa testar *além* da interface, o module provavelmente tem a forma errada.
- **Um adapter é um seam hipotético. Dois adapters são um seam real.** Não proponha seam onde nada varia.
- **Depth é propriedade da interface, não da implementação.** Um module deep pode ser internamente composto de partes pequenas e substituíveis; elas só não fazem parte da interface.

## Onde mora o conhecimento neste repositório

O athlyt **não tem `CONTEXT.md` e não tem `docs/adr/`** — e isso é deliberado. O `AGENTS.md` determina:

> "Everything else — requirements, domain vocabulary, the reasoning behind a decision — lives in the code it governs, as a comment next to what it explains."

Portanto:

- **Nunca proponha criar um `CONTEXT.md`, um glossário central ou uma pasta de ADRs.** Isso contradiz a convenção explícita do projeto. Uma spec que sugere isso será rejeitada com razão.
- **Vocabulário de domínio vem dos comentários no código**, sobretudo em `src/domain/*` (`acesso`, `alimentos`, `catalogo-equipamentos`, `diario`, `ia`, `medicoes`, `plano`, `sessao`, `triagem`). Leia esses comentários antes de nomear qualquer coisa. Os nomes de domínio são em português — Recorte, Trilha, Diário, Sessão, Triagem, Medições, Plano. Use-os como o código os usa.

Leia obrigatoriamente antes de analisar:

1. **`AGENTS.md`** — convenções vinculantes. Toda proposta precisa caber nelas.
2. **`docs/memory/index.md`** e as memórias que ele indexa (bundle OKF). Cada arquivo é uma lição já aprendida — inclusive **hipóteses já refutadas**, marcadas com a tag `hipotese-refutada`. Este é o substituto funcional dos ADRs: **não relitigue o que uma memória já decidiu.**
3. **`src/arquitetura/governanca-ui.ts`** e `src/arquitetura/__tests__/` — governança de arquitetura já codificada e testada, com listas de exceção intencionais (`COMPONENTES_SEM_TESTE_DE_CONTRATO` só encolhe, nunca cresce). Propor algo que a governança já cobre é ruído.

**Referências penduradas.** Algumas memórias citam no frontmatter `sources` caminhos que **não existem no repositório** — `docs/adr/0007-uma-leitura-por-circunferencia.md`, arquivos em `specs/`. Trate a decisão citada como **tomada** mesmo sem o arquivo: o texto da memória é evidência suficiente. Não proponha recriar esses arquivos e não trate a ausência deles como achado arquitetural — é lacuna de documentação, não fricção de código.

### Memória não é diagnóstico atual

Uma memória descreve uma lição do passado; ela pode já ter sido resolvida. Se uma memória descreve fricção que parece um bom candidato, **verifique no código se ela ainda existe** antes de elegê-la. Se ainda existe, a memória é evidência forte a favor — cite-a. Se já foi resolvida, descarte.

## Mapa do repositório

Stack: Next.js App Router + TypeScript, Drizzle (`src/db`, `drizzle/`), Vitest com projetos `unidade` e `integracao`, Playwright (`e2e/`), Storybook como fonte visual da verdade.

Camadas em `src/`: `app` (rotas), `domain`, `db`, `infra`, `auth`, `lib`, `observabilidade`, `arquitetura`, `components`. As camadas de componente são `tela`, `ui`, `fotos`, `navigation`, `inicio`, `sessao`, `diario`, `progresso` — e `ui` é primitivo shadcn/Radix, cujo comportamento **não** é responsabilidade do projeto.

Comandos de verificação que uma spec pode referenciar: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:int`, `npm run test:e2e`, `npm run ui:verificar`, `npm run storybook:verificar`.

Arte prévia para testes: unitários em `src/**/__tests__/*.unit.test.ts`, E2E em `e2e/`. A memória `e2e-sem-camada-de-interacao.md` define a expectativa de forma para testes E2E.

## Processo

### 1. Escopo antes de varrer (YAGNI)

Aprofundar um module só se paga se aquele module for mudar de novo. Decida *onde* olhar antes de olhar:

- Se o usuário nomeou uma direção (module, subsistema, dor específica), use-a e pule a inferência.
- Caso contrário, ache os **hot spots**. `git log --format= --name-only -n 200 | sort | uniq -c | sort -rn | head -40` dá o ranking direto. Deixe esses caminhos puxarem sua atenção primeiro.
- Se as mudanças estiverem espalhadas sem hot spot claro, alargue a rede.

### 2. Explorar e ranquear candidatos

Use um sub-agente para percorrer o código. Não siga heurística rígida; explore organicamente e anote onde você sente fricção:

- Onde entender **um** conceito exige pular entre muitos modules pequenos?
- Onde há modules **shallow**, com interface quase tão complexa quanto a implementação?
- Onde funções puras foram extraídas só para testabilidade, mas os bugs reais moram em *como* elas são chamadas (sem **locality**)?
- Onde modules acoplados vazam através dos seus seams? No athlyt, os seams mais tensos costumam ser server action ↔ domínio, domínio ↔ `db`, e componente de tela ↔ domínio.
- Que partes são intestáveis, ou difíceis de testar através da interface atual?

Aplique o teste da deleção a tudo que parecer shallow.

Levante 3 a 6 candidatos internamente. **Não os publique.** Ranqueie por:

1. **Frequência de mudança** — o module está nos hot spots?
2. **Alavancagem** — quantos chamadores e testes melhoram?
3. **Custo de errar hoje** — o vazamento atual já produz bugs? Uma memória que descreve esse bug é a prova mais forte disponível.
4. **Viabilidade** — dá para descrever a interface aprofundada em prosa clara?

### 3. Eleger UM achado

Escolha o candidato mais forte. **Exatamente um.** Uma spec acionável vale mais que seis observações.

Descarte antes de eleger:

- Candidato que contradiz o `AGENTS.md` ou uma memória estável — a menos que a fricção seja real o bastante para reabrir a decisão. Nesse caso, mantenha e marque explicitamente na spec: *"contradiz a memória X, mas vale reabrir porque…"*.
- Candidato que a governança em `src/arquitetura/` já cobre.
- Candidato especulativo, cujo seam existiria com um único adapter.
- Candidato cuja solução você não consegue descrever sem escrever o código.
- Reorganização de documentação. Esta skill diagnostica código.

Se nenhum candidato passar dessa peneira, **não crie issue**. Reporte "nenhum achado crítico nesta execução" e encerre. Silêncio é um resultado válido e desejável.

### 4. Verificar se o achado é novo

Antes de escrever qualquer coisa, cheque o que já foi reportado. A tarefa roda com frequência; repetir o mesmo diagnóstico destrói a utilidade dele.

Toda issue criada por esta skill leva a label `arch-diagnostic` e uma linha de impressão digital no fim do corpo:

```
<!-- arch-fingerprint: v1 slug=<kebab-case-do-achado> modules=<caminhos,ordenados,separados,por,virgula> -->
```

Busque as issues com a label `arch-diagnostic`, **abertas e fechadas**, e leia as impressões digitais:

- **Mesmo achado, issue aberta** → não crie nada. Encerre reportando qual issue já cobre isso.
- **Mesmo achado, issue fechada** → alguém já decidiu sobre isso. Não reabra o assunto; volte ao passo 3 e eleja o próximo candidato do ranking.
- **Achado novo** → siga.

Dois achados são o mesmo quando o `slug` coincide, ou quando os conjuntos de modules se sobrepõem substancialmente **e** o problema é o mesmo em substância. Isso é julgamento, não comparação de strings: um mesmo module shallow descrito com outras palavras continua sendo o mesmo achado.

### 5. Desenhar os seams

Esboce em que seams a mudança seria testada. Prefira seams existentes a novos. Use o seam mais alto possível. Quanto menos seams atravessados, melhor — o ideal é um.

Como não há com quem confirmar, escolha e registre a escolha na spec, com a alternativa que você descartou e o porquê.

### 6. Escrever a spec e publicar a issue

Título: `[arch] <o achado em uma linha, orientado a problema>`.

Labels: `ready-for-agent` e `arch-diagnostic`. Crie as labels se não existirem; se a criação falhar por permissão, publique a issue mesmo assim e diga isso no relatório final.

Idioma: **português** — é o idioma do domínio, das memórias e dos identificadores deste repositório. Os termos do vocabulário de arquitetura (module, interface, depth, seam, adapter, leverage, locality) ficam em inglês.

Corpo da issue:

```markdown
## Problema

A fricção, do ponto de vista de quem sofre com ela — quem mantém o código, quem chama
o module, quem escreve os testes. Concreto: onde dói, com que frequência, o que já
quebrou. Se uma memória em `docs/memory/` registra esse dano, cite-a pelo arquivo.
Sem jargão de solução.

## Solução

O que muda, em prosa. Que module fica deep, qual interface ele passa a apresentar, em
que seam ela vive. Descreva a interface pelo que o chamador precisa saber — não cole
assinaturas de tipos como se fossem a interface inteira.

## Por que vale a pena

Em termos de leverage (o que os chamadores ganham) e locality (o que os mantenedores
ganham). Inclua o resultado do teste da deleção. Quantifique onde der: N chamadores,
M testes.

## Diagrama (opcional)

Só inclua se o desenho comunicar algo que a prosa não comunica. Use um bloco ```mermaid
— o GitHub renderiza nativamente na issue. Antes/depois da forma do module, ou o grafo
de dependências que hoje vaza pelo seam. Nunca gere arquivo HTML: ele não sobrevive
à execução e ninguém consegue abri-lo a partir da issue.

## Histórias de usuário

Lista numerada, no formato "Como <ator>, quero <capacidade>, para que <benefício>".

Para um refactor, os atores reais são quem mantém, quem chama e quem testa o module —
use-os, e inclua o usuário final apenas quando a mudança de fato o alcança. Cubra o
escopo de verdade, mas **não invente história para encher lista**: cada uma precisa
sobreviver à pergunta "se isso não acontecer, a spec está incompleta?".

## Decisões de implementação

Os modules criados ou modificados, as interfaces que mudam, os seams escolhidos,
mudanças de schema Drizzle, contratos, sequências de chamada.

Não inclua caminhos de arquivo específicos nem trechos de código — envelhecem rápido.
Exceção: um trecho que codifique uma decisão com mais precisão que a prosa (máquina de
estados, shape de tipo, schema). Só a parte que carrega a decisão.

Se a mudança exige vocabulário de domínio novo, diga que o comentário explicativo vai
junto do código que ele governa — nunca num arquivo de glossário.

## Decisões de teste

O que faz um bom teste aqui: exercitar comportamento externo através da interface,
nunca detalhe de implementação. Que modules serão testados, através de que seam, em
que projeto do Vitest (`unidade` ou `integracao`), e se há cenário E2E equivalente a
atualizar. Aponte a arte prévia: testes parecidos que já existem e servem de modelo.

Se a mudança toca `src/components/**`, lembre que a governança exige story adjacente e,
fora da camada `ui`, teste de contrato — verificados por `npm run ui:verificar`.

## Fora de escopo

O que esta spec deliberadamente não resolve, e por quê. Inclua aqui os candidatos
vizinhos que você descartou, para que ninguém amplie o escopo por conta própria.

## Premissas assumidas

Toda decisão que um humano teria tomado e você tomou sozinho: seam escolhido e
alternativa descartada, ambiguidade de domínio resolvida por inferência, memória que
você considerou e por que ela não bloqueia esta proposta. Esta seção é o que torna a
spec auditável.

<!-- arch-fingerprint: v1 slug=... modules=... -->
```

## Verificação antes de publicar

Não publique sem passar por isto:

- [ ] O clone tinha histórico de verdade — a análise de hot spots foi feita, não chutada.
- [ ] Exatamente **um** achado — a issue não virou lista.
- [ ] O problema foi descrito antes da solução, e sem pressupô-la.
- [ ] Teste da deleção aplicado e o resultado está escrito.
- [ ] `AGENTS.md`, `docs/memory/index.md` e `src/arquitetura/` foram lidos, e a proposta não contradiz nenhum deles sem justificar.
- [ ] A spec **não** propõe `CONTEXT.md`, glossário central nem pasta de ADRs.
- [ ] Vocabulário correto — nada de "componente", "serviço", "API" ou "boundary" no sentido arquitetural.
- [ ] Nenhum seam novo proposto com apenas um adapter.
- [ ] Impressões digitais das issues existentes conferidas; este achado é novo.
- [ ] Nenhum arquivo do repositório foi criado ou alterado.
- [ ] A linha `arch-fingerprint` está presente e bem formada.