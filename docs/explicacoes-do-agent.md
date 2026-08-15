# Explicações do agent na interface

Onde o motivo de cada decisão do plano aparece para o atleta, o que já foi
entregue e o que falta.

## Por que este documento existe

A explicação que o agent produz **já é dado estruturado e validado**, não texto
solto. `explicacaoSchema` (`src/domain/ia/operacoes/plano-inicial.ts`) exige
`porque` com no mínimo 40 caracteres e ao menos uma **âncora** — os dados sem os
quais aquela escolha não poderia ter sido tomada. É o schema, não a instrução,
que impede o agent de devolver um genérico de catálogo ("ótimo para peito") ou
de citar um dado que nunca recebeu.

Toda decisão do plano carrega uma: cada exercício, cada dia, o bloco, cada meta
nutricional e cada refeição.

O problema nunca foi produzir a explicação — foi **exibi-la**. Ela ficou visível
apenas nas duas telas de revisão do onboarding. Depois que o rascunho vira Plano
Ativo, o mesmo JSON continua em `plans.conteudo` e nenhuma tela do app lia
`explicacao`. O atleta via o motivo uma vez e nunca mais.

Este documento existe porque o trabalho restante é fácil de perder de vista: o
dado está lá, tudo compila, nada quebra — a explicação simplesmente não aparece,
e ninguém percebe pela ausência.

## Componentes

| Componente | Responsabilidade |
| --- | --- |
| `PorQueIsso` | *O que* é dito: motivo em linguagem direta, depois a origem em pares campo/valor. Trata a ausência (planos anteriores à fatia) em vez de inventar um motivo. |
| `ExplicacaoAgent` | *Quando* e *com quanto peso*. Encapsula `Revelar` + `PorQueIsso` para que esse julgamento seja tomado uma vez, e não reinventado por cada tela. |

As três apresentações de `ExplicacaoAgent`, e a decisão de produto por trás de
cada uma:

| Apresentação | Quando usar | Por quê |
| --- | --- | --- |
| `fechado` | padrão | Custo zero de espaço, descoberta por toque. |
| `aberto` | o atleta está prestes a divergir do plano, ou o plano acabou de mudar | É o momento em que o motivo muda a decisão, não um detalhe secundário. |
| `icone` | telas sob carga física | Entre séries o atleta lê uma frase, não uma tabela de origem. Corta os pares campo/valor. |

O rótulo é sempre a **pergunta que o atleta faria** ("Por que este exercício?").
Uma pergunta convida ao toque; um substantivo ("Justificativa") só rotula uma
gaveta.

## Fatia 1 — entregue

PR [#102](https://github.com/IgorGuariroba/athlyt/pull/102), commit `5386f2a`.

| Tela | O que mostra |
| --- | --- |
| `/sessao/previa/[diaId]` | Explicação do dia e de cada exercício |
| `/inicio` | Divisão do bloco e meta calórica |
| `/mais/objetivo` | Estratégia vigente, junto de onde se decide trocá-la |
| `/mais/trilhas` | Seção "Explicações ao atleta", antes do retorno bruto |

Nas Trilhas as explicações chegavam dentro do JSON do agent, indistinguíveis do
resto. São o único trecho escrito *para* o atleta, e não sobre a chamada;
separá-las evita que a superfície de auditoria seja o único lugar onde a
explicação existe mas ninguém consegue lê-la.

## Fatia 2 — Diário

**Estado:** entregue. Sem migração.

As Entradas Planejadas **não são persistidas**: `montarDiarioDoDia` e
`obterEntradaPlanejada` derivam tudo em memória do Plano Ativo. A explicação já
está no plano — é descartada na conversão, em um único ponto.

| Arquivo | Mudança |
| --- | --- |
| `src/domain/diario/tipos.ts` | `EntradaPlanejada` ganha `explicacao?: ExplicacaoDecisao` |
| `src/domain/diario/cardapio.ts` | `entradasPlanejadas` repassa `refeicao.explicacao` |
| `src/app/(app)/diario/page.tsx` | Cartão planejado (tracejado) — `fechado` |
| `src/app/(app)/diario/refeicao/[refeicaoRef]/page.tsx` | **`aberto`** |
| `src/domain/diario/__tests__/cardapio.unit.test.ts` | Fixture e asserção |
| `e2e/diario.e2e.test.ts` | Asserção do disclosure |

O cartão planejado é onde a pergunta "por que estou comendo isso?" nasce.
Confirmada, a refeição vira Consumo Confirmado e a explicação perde a função —
por isso ela pertence ao estado planejado, não ao confirmado.

A tela de editar é o **único ponto do produto que abre por padrão**: o atleta
está prestes a divergir do plano, e saber que a refeição foi montada pela sua
restrição alimentar e pelo seu tempo de preparo é o dado que muda a decisão.

## Fatia 3 — Sessão de Treino

**Estado:** entregue. Sem migração — `workout_session.exercicios` é `jsonb`.

`planejarExercicios` (`src/domain/sessao/repositorio.ts`) monta o snapshot
congelado do dia e descarta `explicacao`.

| Arquivo | Mudança |
| --- | --- |
| `src/domain/sessao/repositorio.ts` | `ExercicioSessao` ganha `explicacao?`; `planejarExercicios` copia do `DiaTreino` |
| `src/app/(app)/sessao/[id]/page.tsx` | Apresentação **`icone`** no cabeçalho do exercício |
| `src/app/(app)/sessao/[id]/substituir/page.tsx` | Explicação do exercício **original**, no topo |
| `e2e/sessao.e2e.test.ts`, `e2e/substituicao.e2e.test.ts` | Asserções |

Sessões criadas antes desta fatia ficam sem o campo. Exercícios substituídos
também não exibem disclosure: a explicação continua no exercício original
interrompido, mas não é herdada pelo substituto, que foi escolhido por regra
determinística e não pelo agent.

Duas observações que sustentam as decisões:

1. **A apresentação `icone` existe por causa desta tela.** Ela entrou na fatia 1
   e está demonstrada em `/design`, mas **sem nenhum uso real** — esta fatia é o
   que a justifica.
2. **Na tela de substituir, hoje aparece `alternativa.justificativa`** — texto de
   catálogo, genérico. Falta dizer que o exercício sendo trocado foi escolhido
   por causa do ombro do atleta. Isso muda a escolha; a justificativa genérica
   não.

## Fatia 4 — Copiloto de Sessão como agent

**Estado:** especificada em [#104](https://github.com/IgorGuariroba/athlyt/issues/104). Não é continuação das anteriores.

Esta não é sobre exibir explicação existente: é uma **operação de IA inteira que
nunca chegou à interface**. `orientarProximaSerie`
(`src/domain/ia/operacoes/copiloto-sessao.ts`) produz `justificativa`,
`alertaCautela`, `cargaSugeridaKg` e `rirAlvo`, e **só é chamada por
`scripts/verificar-ia.ts`**. Nenhum arquivo em `src/app/` a invoca.

O que a tela mostra é o `PainelCoach`, que roda o Coach Local determinístico no
cliente. Ele foi desenhado como contingência offline — e virou, na prática, a
experiência principal. **A decisão de produto é que o Copiloto seja um agent de
verdade**, com o Coach Local restrito ao que sempre foi: rede ausente.

Três decisões já tomadas, que definem o desenho:

| Questão | Decisão |
| --- | --- |
| Quando o agent fala | A cada série registrada |
| Pode contradizer o plano | Não — ajusta carga, repetições, RIR e descanso; não troca nem encerra exercício |
| Latência | A orientação aparece quando chega; o atleta nunca espera |

A terceira é a que mais restringe, e coincide com uma invariante que a Sessão já
respeita: o timer começa antes de qualquer ida à rede, porque o descanso é tempo
real do atleta. A orientação entra na mesma regra — nada no caminho crítico do
registro da série.

Dois limites que o domínio impõe e a implementação não pode afrouxar:

- **Offline nada simula IA.** Se o Copiloto não pode responder, o Coach Local
  assume declarando origem e versão da regra, e a tela diz isso.
- **`alertaCautela` é Alerta de Cautela** (`CONTEXT.md` > Segurança e auditoria):
  admite override explícito e auditado. Tem semântica própria e não é mais uma
  linha informativa no painel.

## Ordem sugerida

As fatias 2 e 3 estão entregues. A fatia 4 tem PRD próprio em
[#104](https://github.com/IgorGuariroba/athlyt/issues/104) e independe das duas
primeiras — pode ser puxada antes se o Copiloto for prioridade.

## Ao implementar

- Reutilize `ExplicacaoAgent`; não recomponha `Revelar` + `PorQueIsso` na página.
  Se um caso não couber, estenda o componente para que a correção alcance todas
  as telas — é a regra de `DESIGN.md` e do kit em `src/components/tela/`.
- Toda nova composição de tela exige demonstração em `/design` e teste de
  contrato: `npm run ui:verificar` reprova o que faltar.
- Disclosure novo altera o contrato acessível. Atualize o E2E da jornada no mesmo
  conjunto de mudança (`docs/memory/mudanca-ui-atualiza-e2e.md`).
- Para rodar E2E localmente, siga
  `docs/memory/e2e-trava-no-health-check-do-webserver.md`: contra o build
  standalone e com `AUTH_URL` casado, sob pena de a suíte travar sem produzir
  saída alguma.
