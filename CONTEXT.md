# Athlyt

Vocabulário de domínio usado para prescrever, executar e acompanhar treinos.

## Sessão de Treino

**Sessão de Treino**:
O treino completo realizado pelo atleta em uma ocasião, contendo uma sequência de exercícios.
_Avoid_: Treino 1, treino 2 ou treino 3 para identificar exercícios dentro da sessão

**Exercício da Sessão**:
Uma posição numerada da sequência de exercícios de uma Sessão de Treino, como “Exercício 3 de 5”.
_Avoid_: Treino 3

**Mesmo Exercício**:
Exercício com a mesma identidade no catálogo do Athlyt. Variações parecidas, como elevação pélvica com barra e na máquina, mantêm históricos separados.
_Avoid_: Mesmo padrão de movimento; exercício semelhante

**Última Execução do Exercício**:
A ocorrência mais recente do Mesmo Exercício em uma Sessão de Treino anterior.
_Avoid_: Exercício anterior da sessão atual

**Último Registro da Série**:
O registro concluído mais recente do mesmo exercício e do mesmo número de série na conta do atleta, independentemente do aparelho usado. Continua válido quando a Sessão de Treino que o contém é concluída ou abandonada, pois representa trabalho efetivamente realizado.
_Avoid_: Valores da série de mesmo número do exercício anterior da sessão atual; histórico local do aparelho

**Referência da Série**:
Carga, repetições e RIR do Último Registro da Série, usados para preencher a série correspondente na nova execução. Quando diverge da prescrição vigente, continua preenchendo os campos editáveis, enquanto a prescrição permanece visível separadamente como meta.
_Avoid_: Prescrição atual; valores do exercício anterior da sessão atual

**Descanso Prescrito**:
O intervalo entre séries definido pela prescrição vigente do exercício. Não é copiado do histórico nem do exercício anterior da sessão atual.
_Avoid_: Descanso histórico do exercício

**Primeira Execução do Exercício**:
Execução sem nenhum registro histórico do mesmo exercício. A carga começa vazia, enquanto repetições e RIR vêm da prescrição vigente.

**Rascunho da Série**:
Carga, repetições e RIR digitados, mas ainda não confirmados. Permanece associado exclusivamente à série e ao exercício atuais durante a navegação da Sessão de Treino, mas é descartado ao recarregar ou fechar a página e não integra o histórico.
_Avoid_: Registro da série
