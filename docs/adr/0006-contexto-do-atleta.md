# 0006 — Contexto do Atleta como projeção versionada para decisões de IA

## Status

Aceita — 2026-07-30

## Contexto

A IA é o mecanismo central do produto: sem decisões boas, o Athlyt vira um app de registro. A qualidade de um plano, de um ajuste da Revisão Semanal ou de uma orientação do Copiloto de Sessão depende diretamente de quanto o modelo sabe sobre o atleta — objetivo, fase, histórico real de carga, resposta corporal, recuperação, restrições, contexto de vida. **Sonegar dado relevante a uma operação produz recomendação genérica, e recomendação genérica é a falha central que este produto existe para evitar.**

Ao mesmo tempo, a spec fixa três requisitos que um envio indiscriminado de "tudo" quebraria:

- **Consentimento por operação** (itens 105–107) informa dado, finalidade, provedor e retenção. Se toda chamada envia todo o acervo, o texto de consentimento não consegue ser específico nem verdadeiro.
- **Trilha de Decisão** (item 91) registra os dados usados. Se a resposta é sempre "todos", a trilha perde valor investigativo: não há como saber o que pesou numa decisão errada.
- **Qualidade e proveniência** — o Modo Conservador e a ponderação de fontes exigem distinguir medição recente de dado `importado/estimado` antigo. Um blob achata essa distinção e faz o modelo tratar chute como fato.

Há ainda um limite prático: contexto maior não é monotonicamente melhor. Despejar meses de séries cruas dilui o sinal relevante e degrada a decisão, além do custo por token.

O conflito é aparente, não real. Ele se dissolve quando o corte deixa de ser por sensibilidade do dado e passa a ser por relevância para a operação.

## Decisão

Introduzir o **Contexto do Atleta**: projeção derivada, versionada e auditável do estado do usuário, montada no servidor a cada chamada de IA. Não é um dump do banco nem um subconjunto "seguro" — é o conjunto do que aquela operação precisa para decidir bem.

**Princípio de corte:** cada operação recebe todo dado que melhora a decisão, incluindo dado pessoal, íntimo ou sensível, quando esse dado for pertinente à operação — e nada que não seja. O critério é relevância, nunca pudor. Omitir dor no ombro do Copiloto de Sessão, ou transtorno alimentar relatado da estratégia energética, seria uma falha de produto, não uma proteção.

### Camadas

**Núcleo** — acompanha toda chamada. Pequeno, estável, quase sempre relevante: objetivo e fase, Plano Ativo vigente, Modo Conservador, restrições alimentares, limitações físicas e lesões ativas, equipamentos disponíveis, preferências duras. É o mínimo para nunca prescrever algo inviável ou inseguro.

**Recorte de Contexto** — montado por operação, declarando explicitamente os campos que usa. Exemplos:
- `copiloto-sessao`: histórico de carga/RIR **daquele exercício**, prontidão de hoje, dores reportadas, fadiga acumulada da semana.
- `revisao-semanal`: agregados e tendências da janela (aderência, desempenho, tendência corporal, recuperação, utilidade), não linhas cruas.
- `refeicao-foto` / `refeicao-texto`: metas restantes do dia, restrições, padrões alimentares recorrentes.
- `plano-inicial`: triagem completa e histórico importado.

**Ferramentas de leitura** — quando o modelo precisa de algo fora do recorte, ele consulta via tool calling (`historico_exercicio`, `tendencia_peso`, `refeicoes_recentes`) em vez de receber tudo preventivamente. Cada consulta fica registrada. Isso dá alcance amplo sem sacrificar auditabilidade, e resolve o caso em que a necessidade só se revela durante o raciocínio.

### Invariantes

1. Todo valor carrega **proveniência** (`medido`/`importado`/`estimado`) e recência. O modelo é instruído a ponderar por elas.
2. O recorte efetivamente enviado, mais toda chamada de ferramenta, é gravado na **Trilha de Decisão** junto do modelo/provedor resolvido.
3. O **consentimento** é redigido por operação a partir da declaração de campos do recorte — a declaração é a fonte de verdade, e diverge do texto é bug.
4. Recortes são **versionados**; mudar o que uma operação envia é mudança de versão, reproduzível a partir da Trilha.
5. Dado sensível sem consentimento vigente para aquela operação **não é substituído por aproximação silenciosa**: a operação degrada de forma declarada, informando que decidiu com menos informação.

## Consequências

- A qualidade da decisão vira função de um artefato explícito e revisável — o recorte — em vez de acidente de implementação. Recomendação fraca passa a ser diagnosticável: olha-se o recorte.
- Consentimento, Trilha de Decisão e proveniência ganham base mecânica em vez de disciplina manual.
- Custo: cada nova operação de IA exige projetar seu recorte. É trabalho de design recorrente, deliberado — o preço de não ter um dump.
- Risco assumido: um recorte mal desenhado piora a decisão de forma silenciosa. Mitigação é avaliar por operação com casos-teste e comparar recortes candidatos, não presumir.
- Tool calling exige modelos que o suportem bem; a seleção no OpenRouter (ADR 0005) fica restrita a esses nas operações que dependem de ferramentas.
- Ponto de revisita: se o custo de manter recortes superar o ganho em operações de baixo risco, admitir um recorte amplo padrão para elas — mantendo os específicos onde há dado sensível ou decisão estrutural.
