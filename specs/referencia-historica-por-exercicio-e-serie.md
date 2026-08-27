# Referência histórica por exercício e série

## Problema

Ao navegar entre os Exercícios da Sessão, carga, repetições e RIR podem permanecer com os valores do exercício anteriormente exibido. Isso associa dados de exercícios diferentes e impede o atleta de consultar corretamente seu desempenho anterior.

## Resultado esperado

Cada série deve iniciar com a referência histórica do Mesmo Exercício e do mesmo número de série. A troca de exercício nunca pode transportar valores do exercício anterior da sessão atual.

Os termos de domínio usados nesta especificação estão definidos em [`CONTEXT.md`](../CONTEXT.md).

## Regras

1. Para cada série, a Referência da Série contém carga, repetições e RIR do Último Registro da Série da conta do atleta.
2. A busca é feita pela identidade exata do exercício e pelo número da série.
3. Cada número de série possui histórico independente. Se a série 3 não foi registrada na execução mais recente, ela busca seu registro em execuções anteriores sem alterar a origem das demais séries.
4. Séries efetivamente registradas são elegíveis mesmo quando a Sessão de Treino foi posteriormente abandonada.
5. Exercícios semelhantes ou variações do mesmo movimento não compartilham histórico.
6. O histórico pertence à conta do atleta e deve estar disponível em aparelhos diferentes.
7. Quando a prescrição atual divergir do histórico, carga, repetições e RIR históricos preenchem os campos editáveis; a prescrição atual permanece visível separadamente como meta.
8. Na Primeira Execução do Exercício, a carga começa vazia, as repetições usam o valor inicial da prescrição vigente e o RIR usa o valor prescrito.
9. O Descanso Prescrito sempre vem da prescrição vigente. Ele não é recuperado do histórico.
10. Um Rascunho da Série permanece associado somente ao exercício e à série correspondentes enquanto o atleta navega na Sessão de Treino aberta.
11. Rascunhos não confirmados são descartados ao fechar ou recarregar a página e nunca integram o histórico.

## Cenários de aceitação

### Navegação não mistura exercícios

Dado que o atleta concluiu o exercício 2 com determinados valores, quando abre o exercício 3, os campos do exercício 3 exibem somente suas próprias referências históricas ou os valores iniciais da prescrição quando não houver histórico.

### Histórico do mesmo exercício

Dado que a última elevação pélvica registrada contém:

- série 1: 40 kg, 6 repetições, RIR 2;
- série 2: 60 kg, 6 repetições, RIR 2;
- série 3: 80 kg, 5 repetições, RIR 2;

quando uma nova elevação pélvica é iniciada, cada série recebe os valores da série de mesmo número.

### Histórico independente por série

Dado que a execução mais recente possui registros somente para as séries 1 e 2 e que existe um registro mais antigo da série 3, quando o exercício é iniciado novamente, as séries 1 e 2 usam seus registros mais recentes e a série 3 usa seu próprio registro mais recente, ainda que mais antigo.

### Sessão abandonada

Dado que o atleta registrou séries de um exercício e depois abandonou a Sessão de Treino, quando realiza novamente o mesmo exercício, essas séries registradas são elegíveis como referência.

### Primeira execução

Dado que não existe registro anterior do exercício, quando ele é aberto, a carga está vazia, as repetições partem da prescrição vigente e o RIR parte da prescrição vigente.

### Prescrição alterada

Dado que o último registro contém 6 repetições e RIR 2 e a prescrição atual indica 10–15 repetições e RIR 3, quando o exercício é aberto, os campos editáveis começam em 6 e 2, enquanto 10–15 e RIR 3 continuam visíveis como meta.

### Rascunho isolado

Dado que o atleta digitou valores sem confirmar uma série, quando navega para outro exercício, esses valores não aparecem nele; quando retorna ao exercício original sem recarregar a página, o rascunho reaparece na série correta.

### Rascunho após recarregamento

Dado um rascunho não confirmado, quando a página é fechada ou recarregada, o rascunho é descartado e os campos voltam a usar a referência histórica ou a prescrição aplicável.

## Fora de escopo

- Exibir rótulo, data ou origem visual da referência histórica.
- Compartilhar histórico entre exercícios apenas semelhantes.
- Recuperar descanso entre séries do histórico.
- Persistir rascunhos após fechar ou recarregar a página.
