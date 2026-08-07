# 0007 — Uma leitura por circunferência

## Status

Aceita — 2026-08-02

Substitui o protocolo de duas leituras definido na user story 64 de `specs/mvp-vertical.md`.

## Contexto

O protocolo original (`fita-v1`) exigia **duas leituras por região** e uma **terceira quando a divergência excedesse 1 cm**, salvando a mediana das leituras válidas. A justificativa era estatística e legítima: fita métrica tem erro de repetição de ~0,5–1 cm, e sem repetição não há como distinguir ruído de medição de mudança corporal real ao comparar medidas ao longo do tempo.

Na primeira validação da tela de medidas essenciais, o custo desse protocolo ficou explícito. Três regiões × duas leituras = seis campos na triagem, subindo para sete quando uma região divergia. Na tela de proporções, dez regiões × três campos = trinta entradas numéricas. A objeção do usuário foi direta: *"não faz sentido eu medir a mesma parte do corpo 3 vezes; uma única medida serve — ao longo do tempo faz sentido tirar novas medidas das mesmas partes para medir a evolução"*.

A objeção identifica corretamente onde está o valor. A comparabilidade que o produto precisa é **entre sessões separadas por semanas**, não entre leituras separadas por segundos. E a principal fonte de erro nessa comparação não é a tremulação da mão: é medir num ponto anatômico diferente, com postura ou tensão de fita diferentes. Repetir a leitura no mesmo minuto controla a menor das duas fontes de erro, ao custo mais alto de fricção — justamente na triagem, onde o abandono é mais caro.

Há também um risco de qualidade que a repetição não resolve e pode piorar: um usuário cansado de digitar tende a copiar a primeira leitura no segundo campo. Isso produz amplitude zero, `qualidade: "alta"` e uma confiança **falsa** — pior que registrar honestamente uma medida única.

## Decisão

Adotar `fita-v2`: **uma leitura por região**, obrigatória apenas nas três essenciais (cintura, pescoço, quadril).

- `consolidarCircunferencia` aceita de uma a três leituras. Continua calculando a mediana e a amplitude quando houver mais de uma, para não descartar quem opta por conferir.
- Uma leitura única é registrada com `qualidade: "moderada"`, nunca `"alta"`: sem repetição não há evidência de reprodutibilidade, e o dado deve declarar essa incerteza em vez de escondê-la. A Revisão Semanal já pondera evidências por `qualidade`.
- Leituras múltiplas com amplitude > 2 cm continuam sendo recusadas — nesse caso houve erro claro de posicionamento, e aceitar a mediana mascararia o problema.
- Não há mais campo de "terceira leitura" nem fluxo de divergência na UI.
- A confiabilidade da comparação passa a ser sustentada pela **instrução anatômica** exibida em cada região — ponto de referência, postura e tensão da fita —, que é o que efetivamente se repete entre sessões.

Medições gravadas sob `fita-v1` permanecem com esse valor em `protocolo_versao` e não são reinterpretadas. A coluna `leituras_mm` continua sendo um array, então o histórico de duas ou três leituras segue legível sem migração de dados.

## Consequências

**Positivas.** A triagem passa de seis campos para três, e a tela de proporções de trinta para dez. Menos fricção no ponto de maior abandono. O dado registrado passa a declarar sua incerteza real em vez de herdar confiança de uma repetição possivelmente fabricada.

**Negativas.** Perde-se a detecção imediata de erro grosseiro de posicionamento — antes, duas leituras discordantes avisavam na hora. Uma medida isolada errada só será percebida como ponto fora da curva na tendência, semanas depois. A `qualidade: "moderada"` padrão também torna a distinção entre medidas mais fraca: quase tudo cai na faixa do meio.

**Mitigação.** A instrução anatômica por região deixa de ser texto auxiliar e passa a ser o mecanismo principal de reprodutibilidade — precisa permanecer visível no momento da medida, não escondida atrás de um link. Se a tendência de cintura vier a apresentar ruído incompatível com a variação fisiológica esperada, a repetição volta como **opção** ("conferir medida"), nunca como obrigação.

## Alternativas consideradas

**Manter duas leituras obrigatórias.** Máxima qualidade estatística, mas ignora o custo de abandono na triagem e o risco de repetição fabricada. Foi o padrão até esta decisão.

**Uma obrigatória + segunda opcional.** Preserva a via de precisão para quem quer. Descartada por ora: um campo opcional permanentemente visível reintroduz a poluição visual que motivou a mudança, e `consolidarCircunferencia` já aceita múltiplas leituras — então a porta continua aberta para reintroduzir isso como ação explícita, sem novo trabalho de domínio.
