## Problem Statement

O usuário quer construir, com segurança e no menor tempo razoável, uma base física compatível com uma futura competição natural de Men's Physique. Hoje, treino, alimentação, peso, medidas, recuperação e progresso são acompanhados em ferramentas ou decisões separadas. Isso dificulta entender se o plano está produzindo a resposta esperada, distinguir tendência de ruído e ajustar a estratégia sem perder consistência.

O usuário precisa de um coach adaptativo pessoal que conheça seu contexto, prescreva o treino e o cardápio do dia, acompanhe a execução de cada série, registre resultados e realize uma revisão semanal auditável. O sistema deve responder rapidamente a dados locais, mas não pode fingir competência clínica, reagir a uma única medição, trocar exercícios sem motivo ou transformar uma resposta generativa em regra de segurança.

A primeira versão deve fechar o ciclo medir → planejar → executar → registrar → revisar → ajustar. Ela será publicada em produção para uso pessoal, conterá dados sensíveis e precisará continuar útil durante falhas de internet na academia.

## Solution

Criar o **Athlyt**, uma PWA mobile-first de uso pessoal que atua como um coach adaptativo para treino, alimentação e evolução corporal.

A interface segue quatro abas — **Início**, **Diário**, **Progresso** e **Mais** — fundindo os padrões das referências Alpha Progression e MacroFactor documentadas em `workflow-imagens-references/`; o mapa completo de fluxos e telas vive em `specs/workflow.md` e `specs/workflow/telas/`.

Após autenticação Google restrita por allowlist, o usuário passa por uma triagem progressiva em cascata (uma pergunta por tela), que inclui uma **Avaliação Corporal Inicial** progressiva e uma **Importação de Histórico** opcional. A avaliação estabelece linha de base por peso, circunferências padronizadas, referências estruturais e fotos comparáveis; a **Medição de Gordura Corporal** é complementar, preserva método e incerteza e nunca é inferida como valor exato por foto. O usuário pode gerar um plano provisório antes de concluí-la, com limitações explícitas por dimensão. Na Importação de Histórico opcional: o usuário cola texto livre ou anexa arquivos texto/CSV com seu histórico anterior de treino e alimentação, a IA extrai dados estruturados e nada vira dado real sem confirmação item a item, com proveniência `importado/estimado` e consentimento por operação antes do envio ao provedor. Enquanto faltarem dados mínimos, o sistema opera em **Modo Conservador**: oferece orientações de baixo risco e não aplica estratégia energética agressiva. Quando o perfil está suficiente, o **Motor Adaptativo** cria um **Plano Ativo** composto por um **Bloco de Treino** estável e um **Cardápio Diário** prescrito.

Ao fim da triagem o plano é gerado automaticamente e apresentado em uma tela de revisão — resumo do programa, bloco dia a dia com justificativa por exercício e estratégia nutricional — onde o usuário pode substituir exercícios antes de ativar.

Durante a **Sessão de Treino** — lista de exercícios com tabela de séries, no modelo do Alpha Progression — o **Copiloto de Sessão** orienta aquecimento, exercício, carga, repetições, RIR e descanso, e cada exercício oferece **Mídia de Execução** (animação/vídeo de banco licenciado hospedado em storage privado, com fallback de instruções em texto e músculos-alvo) para tirar dúvidas de execução. Online, usa IA para explicações e recomendações contextualizadas; offline, o **Coach Local** aplica apenas regras determinísticas auditáveis, mantém timer e registros e sincroniza os eventos posteriormente.

A alimentação vive na linha do tempo do **Diário**, no padrão MacroFactor com uma camada de planejado vs confirmado: as refeições do Cardápio Diário aparecem como **Entradas Planejadas** (confirmar em um toque, editar ou solicitar **Troca Equivalente**), e qualquer consumo fora do plano entra pelos **Atalhos de Registro** — busca, entrada manual, favoritos/recorrentes, descrição por texto via IA, foto via IA e leitura de código de barras — sempre com confirmação item a item de estimativas e montagem múltipla pelo **Prato**. Peso, circunferências, fotos e prontidão (energia, sono, fadiga, dores, motivação) são agrupados em um **Check-in Diário** único solicitado pela **Cadência Adaptativa**, com limites explícitos contra excesso de medição e reação a ruído.

Uma **Revisão Semanal** — evento guiado de três a cinco telas, anunciado por contagem regressiva na aba Progresso — combina aderência, desempenho, tendência corporal, recuperação e utilidade das recomendações em um **Scorecard de Progresso**. Ajustes pequenos dentro de limites versionados são auto-aplicados (com desfazer); mudanças estruturais são **Experimentos de Plano** versionados, com hipótese, janela de avaliação, critérios de interrupção e rollback para o último plano estável. Cada decisão relevante gera uma **Trilha de Decisão** explicável ao usuário e um registro técnico com retenção controlada.

A segurança usa dois níveis. Um **Alerta de Cautela** permite override explícito e registrado. Um **Bloqueio de Alto Risco** interrompe recomendações de treino ou alimentação, não permite override e apresenta somente orientação para interromper a atividade e procurar atendimento adequado. O produto não diagnostica, não substitui profissionais de saúde e não prescreve drogas, hormônios, SARMs, diuréticos, doses tóxicas ou desidratação extrema.

## User Stories

1. Como usuário autorizado, quero entrar com minha conta Google, para acessar o aplicativo sem administrar outra senha.
2. Como proprietário do aplicativo, quero restringir o acesso a uma allowlist de e-mails, para impedir cadastros públicos nesta versão.
3. Como usuário não autorizado, quero receber uma mensagem clara de acesso restrito sem criar perfil ou persistir dados de saúde, para entender por que não posso prosseguir.
4. Como usuário, quero encerrar minha sessão em todos os dispositivos, para recuperar o controle da conta em caso de perda do aparelho.
5. Como usuário, quero iniciar o onboarding com poucos dados e continuar depois, para não abandonar o produto por um formulário longo.
6. Como usuário, quero saber quais informações ainda faltam e como elas afetam a personalização, para decidir o que preencher em seguida.
7. Como usuário, quero informar idade, sexo biológico relevante aos cálculos, altura e peso, para receber estimativas contextualizadas.
7a. Como usuário, quero iniciar uma Avaliação Corporal Inicial progressiva sem bloquear meu primeiro plano, para melhorar a personalização quando eu puder concluir a coleta.
7b. Como usuário, quero registrar cintura, pescoço e quadril como medidas essenciais e tórax, ombros, braços, coxas e panturrilhas como conjunto completo, para estabelecer uma linha de base corporal reproduzível.
7c. Como usuário, quero registrar ambos os lados de braços, coxas e panturrilhas, para investigar simetria sem confundir erro de fita com diferença real.
7d. Como usuário, quero registrar punho e tornozelo uma vez como referências aproximadas da minha estrutura, sem tratá-los como limites genéticos.
7e. Como usuário, quero registrar percentual de gordura com método, data, protocolo, equipamento e profissional quando aplicável, para interpretar tendências sem misturar métodos incompatíveis.
7f. Como usuário, quero receber Metas de Proporção Corporal com faixa de referência, meta do ciclo, direção, confiança e justificativa, para perseguir um físico estético sem tratar uma fórmula como corpo perfeito universal.
7g. Como usuário, quero informar minhas preferências de ênfase corporal e entender seus efeitos, para cocriar metas sem ultrapassar limites de saúde e segurança.
8. Como usuário, quero registrar experiência de treino, disponibilidade semanal e duração possível das sessões, para receber um plano executável.
8a. Como usuário, quero importar meu histórico anterior de treino e alimentação em texto livre ou arquivos texto/CSV, para que o plano inicial aproveite minha experiência real.
8b. Como usuário, quero revisar e confirmar item a item o que a IA interpretou do meu histórico, para que nenhuma estimativa vire dado real sem meu aceite.
8c. Como usuário, quero consentir explicitamente antes que meu histórico seja enviado ao provedor de IA, para controlar a exposição de dados sensíveis.
8d. Como usuário, quero acessar a Importação de Histórico depois do onboarding, para completá-la quando tiver os dados em mãos.
9. Como usuário, quero registrar academia, equipamentos disponíveis e limitações logísticas, para não receber exercícios inviáveis.
10. Como usuário, quero registrar lesões, condições de saúde, medicamentos, desconfortos e contraindicações conhecidas, para que o plano respeite riscos informados.
11. Como usuário, quero registrar preferências, alergias, intolerâncias, restrições alimentares, orçamento e tempo de preparo, para receber um cardápio praticável.
12. Como usuário, quero informar rotina, sono e nível habitual de atividade, para contextualizar recuperação e gasto energético.
13. Como usuário, quero informar meu objetivo de construir uma base natural de Men's Physique, para orientar a priorização de proporções, desempenho e composição corporal.
14. Como usuário, quero começar em Modo Conservador granular enquanto dados estiverem ausentes, sem consentimento ou com baixa qualidade, para usar as capacidades confiáveis sem receber falsa personalização nas demais.
15. Como usuário, quero ver a confiança de composição corporal, proporções, simetria bilateral, treinamento, nutrição e saúde/recuperação, para entender qual dado melhora cada capacidade.
16. Como usuário, quero que uma resposta de risco limite somente a área afetada quando isso for seguro, para não perder recursos não relacionados.
17. Como usuário, quero corrigir e versionar informações do perfil, para que ajustes futuros usem dados atuais sem apagar o histórico.
18. Como usuário, quero receber um Bloco de Treino estável de quatro a oito semanas, para medir progressão sem variação aleatória.
19. Como usuário, quero que o bloco detalhe frequência, divisão, exercícios, aquecimentos, séries, faixas de repetição, RIR e descansos, para saber exatamente como executá-lo.
20. Como usuário, quero entender por que cada exercício foi selecionado, para auditar sua relação com meus objetivos, equipamentos e limitações.
21. Como usuário, quero que exercícios-chave permaneçam estáveis enquanto forem eficazes e toleráveis, para comparar meu desempenho ao longo do tempo.
22. Como usuário, quero substituir imediatamente um exercício indisponível, doloroso ou contraindicado, para concluir a sessão com segurança.
23. Como usuário, quero que uma substituição preserve o estímulo pretendido quando possível, para não descaracterizar o bloco.
24. Como usuário, quero que a IA não troque exercícios apenas para criar variedade, para manter uma progressão mensurável.
25. Como usuário, quero abrir o treino do dia em poucos toques, para iniciar a sessão sem navegar por dashboards.
26. Como usuário treinando com uma mão, quero botões grandes e uma ação principal por tela, para registrar séries com baixo atrito.
27. Como usuário, quero ver a próxima série, meta de repetições, carga sugerida, RIR e descanso, para executar o plano corretamente.
27a. Como usuário com dúvida na execução, quero abrir animação/vídeo, instruções e músculos-alvo do exercício, inclusive offline, para executar com técnica correta.
27b. Como usuário, quero revisar o plano gerado antes de ativá-lo e substituir exercícios pontualmente, para começar com um bloco que confio.
28. Como usuário, quero registrar carga, repetições concluídas e RIR de cada série, para alimentar os ajustes de desempenho.
29. Como usuário, quero registrar dor, desconforto, falha técnica e motivo de interrupção, para impedir que desempenho ruim seja interpretado incorretamente.
30. Como usuário, quero iniciar e receber alertas do timer de descanso, para manter a sessão consistente.
31. Como usuário, quero receber vibração e áudio curto antes ou depois das séries, para ser orientado sem olhar continuamente para a tela.
32. Como usuário, quero abrir o microfone somente quando solicitar, para conversar com o coach sem escuta contínua.
33. Como usuário, quero silenciar o coach e usar somente texto/vibração, para treinar discretamente.
34. Como usuário, quero que o coach sugira pequenos ajustes de carga, repetição ou descanso entre séries, para adequar a sessão à resposta real.
35. Como usuário, quero ver se uma orientação veio da IA online ou de uma regra local, para conhecer sua capacidade e limitação naquele momento.
36. Como usuário, quero continuar o treino quando a internet cair, para não perder timer, plano ou registros.
37. Como usuário offline, quero que somente regras locais previamente validadas ajustem a sessão, para não receber uma simulação enganosa de IA.
38. Como usuário offline, quero ver claramente o estado da conexão e da sincronização, para saber quais recursos estão degradados.
39. Como usuário, quero que registros offline sejam enfileirados e sincronizados sem duplicação ao reconectar, para manter um histórico íntegro.
40. Como usuário, quero que conflitos de sincronização sejam apresentados quando não puderem ser resolvidos com segurança, para não perder alterações silenciosamente.
41. Como usuário, quero que a IA revise o ocorrido offline após a reconexão sem reescrever silenciosamente a sessão, para preservar o registro factual.
42. Como usuário, quero concluir ou abandonar uma sessão informando o motivo, para diferenciar aderência, indisponibilidade e problema físico.
43. Como usuário, quero consultar o histórico de sessões e séries, para observar minha progressão em exercícios-chave.
44. Como usuário, quero receber um Cardápio Diário com refeições, alimentos, quantidades, calorias, proteína, carboidratos, gorduras e fibras, para executar a estratégia nutricional.
45. Como usuário, quero que o cardápio respeite preferências, restrições, orçamento e tempo de preparo, para torná-lo sustentável.
46. Como usuário, quero ver a meta diária e a distribuição planejada entre refeições, para entender o papel de cada refeição.
47. Como usuário, quero buscar alimentos em uma base nutricional auditável, para registrar consumo com proveniência conhecida.
48. Como usuário, quero registrar manualmente alimento, quantidade e unidade quando a busca não bastar, para não deixar refeições incompletas.
49. Como usuário, quero salvar alimentos e refeições recorrentes, para reduzir o atrito diário.
49a. Como usuário, quero descrever em texto livre o que comi e receber uma estimativa estruturada da IA, para registrar refeições sem procurar item por item.
49b. Como usuário, quero fotografar meu prato e receber uma estimativa multimodal de itens e porções, para registrar com mínimo atrito.
49c. Como usuário, quero ler o código de barras de um produto embalado, para registrá-lo com dados da base e proveniência conhecida.
49d. Como usuário, quero montar vários alimentos em um Prato com subtotal de calorias e macros, para registrar uma refeição inteira de uma vez.
49e. Como usuário, quero ver as refeições prescritas como Entradas Planejadas na linha do tempo do dia, para confirmar, editar ou trocar cada uma no contexto do meu dia.
50. Como usuário, quero confirmar, editar ou rejeitar uma estimativa alimentar antes que ela seja tratada como consumo real, para evitar dados falsos.
51. Como usuário, quero marcar uma refeição como consumida conforme planejada, para registrar aderência rapidamente.
52. Como usuário, quero registrar desvios sem linguagem punitiva ou moralizante, para manter honestidade e aderência.
53. Como usuário, quero solicitar uma Troca Equivalente quando faltar ingrediente ou eu não quiser uma refeição, para manter metas sem seguir um cardápio rígido.
54. Como usuário, quero que a troca preserve calorias e macros dentro de tolerâncias explícitas, além das minhas restrições e contexto, para ser realmente equivalente.
55. Como usuário, quero que o restante do dia seja recalculado quando uma troca material alterar as metas, para continuar com um plano executável.
56. Como usuário, quero visualizar o que ainda falta de proteína, carboidrato, gordura, energia e fibra, para orientar as próximas refeições.
57. Como usuário, quero que nutrientes tenham fonte, versão/data e grau de confiança, para auditar os cálculos.
58. Como usuário, quero que fontes conflitantes sejam ponderadas por credencial, método, reprodutibilidade, atualidade, adequação contextual e concordância, para usar o dado mais defensável.
59. Como usuário, quero ver quando um valor nutricional é uma estimativa ou faixa, para não confundir aproximação com medição laboratorial.
60. Como usuário, quero que estratégias avançadas se limitem a práticas naturais, legais e seguras, para permanecer compatível com competição natural.
61. Como usuário, quero que suplementos sugeridos mostrem evidência, benefício esperado, custo, dose segura e contraindicações, para tomar decisões informadas.
62. Como usuário, quero que o app se recuse a prescrever drogas, hormônios, SARMs, diuréticos, doses tóxicas ou desidratação extrema, para evitar protocolos incompatíveis com segurança e competição natural.
63. Como usuário, quero registrar meu peso quando solicitado pela Cadência Adaptativa, para acompanhar tendência sem reagir a um valor isolado.
64. Como usuário, quero registrar circunferências com instruções padronizadas, duas leituras e uma terceira diante de divergência material, para tornar comparações mais reproduzíveis.
64a. Como usuário, quero que diferenças pequenas entre lados permaneçam dentro da incerteza até serem confirmadas, para não alterar o treino por ruído de medição.
64b. Como usuário, quero que mudanças súbitas de assimetria acompanhadas de dor, inchaço ou perda de força acionem segurança em vez de mais treino unilateral, para não agravar um possível problema.
65. Como usuário, quero registrar fotos corporais com orientação de pose, distância, enquadramento e iluminação, para reduzir variação não corporal.
66. Como usuário, quero que a Cadência Adaptativa escolha quando solicitar cada medição com base na fase, variabilidade e aderência, para obter dados suficientes com menor atrito.
67. Como usuário, quero que peso seja solicitado no máximo uma vez ao dia, cintura no máximo semanalmente, conjunto completo de circunferências e fotos no máximo mensalmente, para evitar sobrecoleta.
68. Como usuário, quero que a frequência seja reduzida se a medição gerar ansiedade ou comportamento compulsivo, para proteger meu bem-estar.
69. Como usuário, quero ver tendências e médias móveis em vez de conclusões baseadas em um dia, para distinguir progresso de ruído.
70. Como usuário, quero comparar fotos longitudinalmente, para observar mudanças que peso e fita métrica não capturam.
71. Como usuário, quero avaliar simetria e proporções relacionadas ao padrão Men's Physique, para direcionar a construção do físico em V.
72. Como usuário, quero uma avaliação visual separada por critérios de julgamento, para entender pontos fortes e lacunas sem uma nota opaca.
73. Como usuário, quero receber gordura corporal visual como faixa probabilística, para não tratar uma foto como medição exata.
74. Como usuário, quero que mudanças importantes nunca sejam feitas somente por foto, para exigir convergência com peso, cintura, desempenho e recuperação.
74a. Como usuário, quero que métodos diferentes de gordura corporal permaneçam em séries separadas, para não interpretar troca de método como mudança corporal.
74b. Como usuário, quero que dados corporais conflitantes reduzam confiança e mantenham o plano estável até confirmação, para evitar ajustes precipitados.
74c. Como usuário, quero que novas prioridades corporais sigam evidência → proposta → aprovação quando forem estruturais, para manter controle sobre treino e alimentação.
75. Como usuário, quero informar energia, sono, fadiga, dores e motivação com entradas rápidas, para contextualizar prontidão e recuperação.
76. Como usuário, quero que dados ausentes ou inconsistentes reduzam a agressividade dos ajustes, para que incerteza não seja tratada como certeza.
77. Como usuário, quero uma Revisão Semanal que compare planejado, realizado e resposta corporal, para entender se treino e alimentação estão funcionando.
78. Como usuário, quero um Scorecard de Progresso que combine aderência, desempenho, tendência corporal, recuperação e utilidade, para não depender de uma única métrica.
79. Como usuário, quero que a velocidade-alvo seja definida somente após uma linha de base suficiente, para evitar metas arbitrárias.
80. Como usuário, quero ver quais dados sustentam ou enfraquecem uma conclusão semanal, para auditar sua confiança.
81. Como usuário, quero que alterações locais de série ocorram durante o treino, para responder rapidamente com baixo risco.
82. Como usuário, quero que pequenas trocas alimentares ocorram durante o dia, para adaptar o cardápio ao mundo real.
83. Como usuário, quero que calorias, volume semanal, divisão de treino e fase mudem somente em uma revisão estrutural, para evitar instabilidade.
84. Como usuário, quero que uma mudança estrutural declare hipótese, resultado esperado e variáveis alteradas, para saber o que está sendo testado.
85. Como usuário, quero que poucas variáveis sejam alteradas por Experimento de Plano, para tornar o resultado interpretável.
86. Como usuário, quero que cada experimento tenha janela mínima, critérios de sucesso e critérios de interrupção, para impedir ajustes impulsivos.
87. Como usuário, quero reverter ao último Plano Estável quando um experimento falhar, para recuperar rapidamente uma estratégia conhecida.
88. Como usuário, quero aprovar manualmente um rollback sugerido ou permitir rollback automático conforme regras configuradas, para manter controle sobre mudanças relevantes.
89. Como usuário, quero comparar versões do plano, para entender exatamente o que mudou.
90. Como usuário, quero uma explicação simples de cada recomendação, para tomar decisões sem ler logs técnicos.
91. Como usuário técnico, quero uma Trilha de Decisão com dados usados, qualidade, regra/cálculo, versões, fontes, riscos e resultado, para investigar erros.
92. Como usuário, quero saber quando uma recomendação dependeu de conteúdo gerado por modelo, para distinguir síntese probabilística de regra determinística.
93. Como usuário, quero que cálculos, limites de segurança e progressões críticas sejam determinísticos, para que possam ser reproduzidos e auditados.
94. Como usuário, quero que pesquisa externa use fontes permitidas e pontuadas, para reduzir influência de marketing e conteúdo fraco.
95. Como usuário, quero que uma nova fonte não vire regra automaticamente, para impedir mudança de protocolo sem curadoria/versionamento.
96. Como usuário, quero que recomendações com evidência tragam citações rastreáveis, para verificar a origem.
97. Como usuário, quero que divergências entre fontes permaneçam visíveis quando materiais, para não esconder incerteza em uma média arbitrária.
98. Como usuário, quero receber um Alerta de Cautela diante de fadiga incomum, recuperação ruim ou desconforto moderado, para reconsiderar a atividade.
99. Como usuário, quero poder sobrescrever um Alerta de Cautela com confirmação explícita, para preservar autonomia em situações moderadas.
100. Como usuário, quero que todo override registre alerta, horário, escolha e contexto, para manter responsabilidade e auditoria.
101. Como usuário, quero que sintomas de alto risco gerem um Bloqueio de Alto Risco sem override, para o app não orientar continuação potencialmente perigosa.
102. Como usuário em Bloqueio de Alto Risco, quero receber apenas instrução de interromper e procurar atendimento adequado, para não confundir o app com atendimento clínico.
103. Como usuário, quero que o app não diagnostique condições nem interprete exames como prescrição clínica, para respeitar limites de competência.
104. Como usuário, quero revisar e corrigir falsos positivos de segurança depois do evento sem apagar o bloqueio histórico, para melhorar o sistema sem adulterar fatos.
105. Como usuário, quero consentir explicitamente antes de enviar foto, documento ou outro dado sensível bruto ao provedor de IA, para controlar exposição externa.
106. Como usuário, quero que o consentimento informe dado, finalidade, provedor e retenção, para tomar uma decisão específica.
107. Como usuário, quero revogar consentimentos futuros sem apagar decisões históricas necessárias à auditoria, para controlar usos posteriores.
108. Como usuário, quero exportar meus dados e histórico de decisões em formato utilizável, para não ficar preso ao produto.
109. Como usuário, quero excluir minha conta e dados conforme política apresentada, para exercer controle sobre informações sensíveis.
110. Como usuário, quero que fotos e arquivos tenham acesso privado e URLs não enumeráveis/temporárias, para evitar exposição pública.
111. Como usuário, quero que logs operacionais não incluam dados de saúde em texto aberto, para reduzir vazamentos acidentais.
112. Como operador, quero backups criptografados e versionados fora da VPS, para recuperar dados após falha do servidor.
113. Como operador, quero monitoramento externo de disponibilidade e jobs críticos, para detectar indisponibilidade mesmo quando a VPS cair.
114. Como operador, quero que falhas da IA, pesquisa ou storage não impeçam registro básico de treino, para preservar a função crítica do app.
115. Como operador, quero idempotência em sincronizações e jobs, para reexecutá-los sem duplicar eventos ou decisões.
116. Como operador, quero versões registradas do modelo, prompt/protocolo e regras determinísticas, para reproduzir o contexto de uma decisão.
117. Como usuário, quero avaliar se uma recomendação foi útil, para incluir qualidade percebida no Scorecard de Progresso.
118. Como usuário, quero visualizar o estado atual do ciclo — medir, planejar, executar, registrar, revisar ou ajustar — para saber a próxima ação útil.
119. Como usuário, quero que o dashboard priorize o treino, a próxima refeição e medições pendentes, para agir sem interpretar muitos gráficos.
119a. Como usuário, quero personalizar a ordem e a visibilidade dos cartões do Início, para adaptar o dashboard à minha rotina.
119b. Como usuário, quero registrar prontidão, peso e demais medições em um Check-in Diário único e rápido, para manter o ritual sem atrito.
119c. Como usuário, quero que ajustes pequenos da Revisão Semanal sejam auto-aplicados dentro de limites versionados e com opção de desfazer, para não ser interrompido por aprovações triviais.
120. Como usuário, quero que a interface seja acessível, responsiva e utilizável no celular, para operar o app na academia e na cozinha.

## Implementation Decisions

- O produto se chamará **Athlyt** e será uma aplicação nova, pessoal e hospedada em produção.
- A primeira entrega é um MVP vertical que fecha o ciclo completo de acompanhamento; integrações mais sofisticadas serão adicionadas depois de validar esse ciclo.
- O frontend e backend web usarão TypeScript com Next.js App Router em formato PWA mobile-first.
- O sistema usará PostgreSQL como banco relacional e Auth.js com Google como autenticação.
- A autorização será separada da autenticação: apenas e-mails presentes em allowlist poderão criar/acessar o perfil.
- A infraestrutura principal será executada em VPS por Dockploy. Storage privado de objetos e backups criptografados/versionados ficarão fora da VPS.
- Processos assíncronos cuidarão de revisão semanal, sincronização, limpeza de retenção e futuras integrações. Jobs deverão ser idempotentes.
- O Vercel AI SDK abstrairá a conexão com modelos. Modelos serão substituíveis e sua identidade/versão será registrada por decisão.
- Tavily será o provedor de pesquisa futura. No MVP, protocolos e fontes serão curados/versionados; pesquisa dinâmica em tempo real fica fora do escopo.
- O domínio será organizado em módulos coesos: Identidade e Acesso; Perfil e Triagem; Planejamento de Treino; Execução da Sessão; Nutrição; Medições e Evolução; Recuperação; Motor Adaptativo; Segurança; Evidências; Auditoria; Sincronização.
- A navegação de topo terá quatro abas — Início, Diário, Progresso e Mais — conforme o mapa de fluxos em `specs/workflow.md`; as telas numeradas em `specs/workflow/telas/` são a referência de UI, ancoradas nas capturas de `workflow-imagens-references/`.
- O Início será um dashboard de cartões em ordem de prioridade (estado do ciclo, treino do dia, Check-in Diário, próxima refeição, macros do dia, contagem até a Revisão Semanal, cartões condicionais), com ordem e visibilidade personalizáveis pelo usuário.
- O onboarding será uma cascata longa de uma pergunta por tela com barra de progresso. A Avaliação Corporal Inicial será progressiva: peso, cintura, pescoço e quadril primeiro; conjunto completo, punho/tornozelo, fotos e Medição de Gordura Corporal podem ser concluídos na primeira semana. Abandono deixa o app utilizável em Modo Conservador granular e o Início explica o benefício concreto de cada dado pendente, sem culpa, comparação social ou nota estética.
- A Importação de Histórico aceitará texto livre e arquivos texto/CSV, será interpretada por IA com resumo estruturado e confiança por item, exigirá confirmação item a item, marcará dados aceitos com proveniência `importado/estimado` (confiança inferior a dados medidos no app) e exigirá consentimento por operação antes do envio. Ficará disponível na triagem e depois em Mais.
- O Plano Ativo nascerá automaticamente ao fim da triagem e passará por uma tela de revisão (resumo do programa, dia a dia com justificativa por exercício, estratégia nutricional) com substituições pontuais pré-ativação registradas na Trilha de Decisão; não haverá wizard manual de criação de plano.
- A Sessão de Treino usará o modelo lista: treino do dia em lista de exercícios, tabela de séries por exercício (carga, repetições, RIR), timer de descanso em overlay e notificação, resumo final com recordes.
- Cada exercício terá Mídia de Execução de banco aberto/licenciado hospedada no storage privado do produto (disponível offline), com fallback de instruções em texto e diagrama de músculos-alvo quando faltar mídia.
- O Diário será uma linha do tempo diária unificada (refeições, sessões, check-ins, medições): Entradas Planejadas do Cardápio Diário em estado planejado com ações confirmar/editar/trocar; consumo fora do plano pelos Atalhos de Registro; Prato para montagem múltipla com subtotal; painel de macros consumido vs restante no topo.
- Os Atalhos de Registro incluirão busca, entrada manual, favoritos/recorrentes, descrição por texto via IA, foto via IA (multimodal, com consentimento por operação) e scanner de código de barras; a ordem dos atalhos será personalizável.
- As medições serão agrupadas em um Check-in Diário único decidido pela Cadência Adaptativa: prontidão sempre, peso quando solicitado, cintura no máximo semanalmente e conjunto completo de circunferências/fotos no máximo mensalmente; registro avulso continua possível. Circunferências terão protocolo visual, duas leituras, terceira por divergência e mediana das leituras válidas.
- A Revisão Semanal será um fluxo guiado de três a cinco telas (planejado vs realizado → Scorecard → evidências → proposta); ajustes pequenos dentro de limites versionados serão auto-aplicados com opção de desfazer; mudanças estruturais e Experimentos de Plano exigirão aprovação explícita.
- A aba Progresso terá um cartão de estratégia no topo (Plano Ativo, contagem regressiva até a Revisão, Experimento em andamento) sobre gráficos configuráveis (força por exercício-chave, tendência de peso por média móvel, circunferências, fotos lado a lado, volume semanal por músculo).
- A IA conversacional será contextual e embutida — botões de coach na Sessão, no Diário, na Revisão e em cada recomendação (“por quê?” → Trilha de Decisão) — sem superfície de chat global.
- O **Plano Ativo** referencia uma versão imutável do Bloco de Treino, estratégia nutricional e regras de cadência. Novas decisões criam versões, não sobrescrevem o passado.
- O **Modo Conservador** será explícito e granular por composição corporal, proporções, simetria bilateral, treinamento, nutrição e saúde/recuperação, derivado de suficiência, consentimento e qualidade. Restringirá somente dimensões afetadas, salvo risco de saúde sistêmico, e não criará déficit/superávit agressivo nem progressões avançadas.
- O Bloco de Treino permanecerá estável por quatro a oito semanas, salvo segurança, equipamento, desconforto ou contraindicação.
- Progressão usará carga, repetições, RIR, desempenho histórico, dor, aderência e recuperação. O modelo não decidirá limites críticos diretamente.
- O fluxo de sessão será event-driven: início, série planejada, série registrada, ajuste sugerido/aceito, alerta, descanso, exercício substituído, sessão concluída/abandonada e sincronização.
- Eventos gerados offline terão identificador estável, timestamp do dispositivo, ordem lógica e estado de sincronização para garantir idempotência.
- O **Coach Local** será um pacote determinístico e versionado disponível no dispositivo. Ele poderá ajustar somente decisões de baixo risco previamente autorizadas.
- A UI indicará explicitamente os estados online, offline, sincronizando, com conflito e degradado.
- O áudio será de saída pontual e a voz será entrada sob demanda. Não haverá microfone continuamente ativo por padrão.
- A alimentação usará Cardápio Diário prescrito com refeições e metas. Consumo planejado e consumo confirmado serão entidades distintas.
- Trocas Equivalentes preservarão energia/macros dentro de tolerâncias configuradas e respeitarão preferências, restrições, custo e preparo.
- A composição nutricional manterá proveniência por alimento/nutriente. O score de fonte considerará credencial, método analítico, reprodutibilidade, atualidade, adequação ao alimento/preparo/região e concordância.
- Bases colaborativas poderão ajudar na descoberta, mas valores não validados serão marcados com confiança inferior. A IA não inventará composição sem indicar estimativa.
- A Cadência Adaptativa decidirá solicitações dentro de limites: peso no máximo diário, cintura no máximo semanal, conjunto completo de circunferências e fotos no máximo mensal e revisão de tendências no máximo semanal para mudanças estruturais ordinárias. Medições de gordura externas não terão calendário obrigatório.
- O sistema poderá reduzir a frequência diante de ansiedade ou comportamento compulsivo informado/detectado; não aumentará além dos limites sem nova decisão de produto.
- Fotos serão armazenadas privadamente e processadas somente com consentimento específico quando saírem da infraestrutura.
- Análise visual produzirá comparação longitudinal, critérios separados de julgamento, observações de simetria e faixa probabilística de gordura. Não produzirá diagnóstico nem percentual apresentado como exato.
- Medições de Gordura Corporal preservarão método, data, protocolo, equipamento e profissional quando aplicável; tendências serão comparadas prioritariamente dentro do mesmo método/protocolo, sem transformar troca de método em mudança real.
- Metas de Proporção Corporal combinarão referências estéticas versionadas de Men's Physique sustentável com altura, estrutura aproximada, preferências e trajetória individual. Exibirão medida atual, faixa de longo prazo, meta do ciclo, direção, confiança e justificativa; não prometerão medida ou prazo e nunca prevalecerão sobre saúde/segurança.
- Ajustes estruturais exigirão triangulação: nenhuma foto, circunferência, pesagem ou medição de gordura isolada mudará calorias, volume semanal, divisão ou fase. Dados conflitantes mantêm o Plano Ativo estável, reduzem confiança e solicitam confirmação.
- O Scorecard de Progresso combinará aderência, desempenho, tendência corporal, recuperação e utilidade. Pesos e limiares serão versionados e explicáveis.
- O Motor Adaptativo operará em três velocidades: ajustes locais por série; ajustes alimentares pequenos durante o dia; mudanças estruturais em revisão semanal. Segurança pode agir imediatamente.
- Mudanças estruturais serão Experimentos de Plano. Cada experimento registrará hipótese, baseline, variáveis, resultado esperado, janela mínima, critérios de sucesso/interrupção e plano de rollback.
- O último Plano Estável será sempre identificável. Rollback criará uma nova versão que referencia a reversão, em vez de apagar versões anteriores.
- O motor será híbrido: regras, cálculos e limites críticos em código determinístico; IA para síntese, explicação, coleta conversacional e personalização dentro de opções seguras.
- A camada de IA receberá todos os dados pertinentes à operação por Recorte de Contexto, mas não dados brutos irrelevantes. Treino pode receber medidas, assimetrias confirmadas e Metas de Proporção Corporal; nutrição pode receber tendências de peso/composição e objetivo; fotos brutas ficam restritas à análise visual quando uma projeção derivada bastar. Dados sensíveis brutos exigirão consentimento por operação com finalidade, provedor e retenção informados; ausência de consentimento degrada a capacidade correspondente sem alegar personalização inexistente.
- O sistema não persistirá “raciocínio interno” do modelo. A auditoria técnica guardará entrada relevante minimizada, resposta, ações propostas, versões e evidências pelo período necessário e configurado.
- A auditoria terá duas vistas: Trilha de Decisão legível e log técnico com acesso restrito/retenção controlada.
- Alertas terão dois níveis. Alerta de Cautela admite override explícito e auditado; Bloqueio de Alto Risco não admite override para novas recomendações.
- O classificador de segurança combinará respostas estruturadas, regras determinísticas e validação de saída do modelo. Falha ou baixa confiança deverá favorecer degradação segura.
- Em alto risco, o sistema interromperá orientações e mostrará apenas mensagens pré-aprovadas de interrupção e busca de atendimento; não improvisará instruções clínicas.
- Protocolos de competição natural poderão incluir estratégias legais e conservadoras, mas ficam proibidas recomendações de esteroides, SARMs, hormônios, diuréticos, drogas, doses tóxicas e desidratação extrema.
- As APIs públicas do produto serão orientadas a capacidades de domínio, não a tabelas: concluir triagem, obter plano ativo, iniciar/registrar sessão, confirmar consumo, solicitar troca, registrar medição, executar revisão, aceitar/reverter experimento e consultar trilha.
- Operações de escrita aceitarão chave de idempotência quando puderem ser repetidas por rede instável.
- Horários serão persistidos em UTC com fuso do usuário para apresentação e definição do “dia” alimentar/treino.
- Dados de identidade serão logicamente separados de saúde e fotos. Logs e analytics não receberão conteúdo sensível em texto aberto.
- O produto exibirá claramente que é um coach adaptativo, não médico, nutricionista ou serviço de emergência.
- O MVP terá entrada alimentar completa: busca na base nutricional, entrada manual, alimentos/refeições salvos, descrição de refeição por texto interpretada por IA, foto de refeição interpretada por IA multimodal e leitura de código de barras. Toda estimativa gerada por IA ou por base externa exigirá confirmação item a item antes de virar consumo real e será marcada com proveniência e confiança apropriadas.
- Open Wearables será uma integração self-hosted futura. Sua interface deverá normalizar sinais, preservar fonte/qualidade e degradar com confirmação humana quando incompleta.

## Testing Decisions

- O seam principal será a jornada completa observável pela interface e APIs públicas: autenticação → triagem → Plano Ativo → Sessão de Treino online/offline → alimentação/medidas → Revisão Semanal → Experimento de Plano → rollback.
- Bons testes verificarão comportamento externo, decisões persistidas e mensagens ao usuário; não afirmarão chamadas internas, estrutura de componentes, detalhes do ORM ou texto exato de prompts.
- A suíte principal usará cenários determinísticos com relógio controlado, provedor de IA falso por contrato, catálogo nutricional fixo e simulação de conectividade. Isso permite reproduzir decisões sem depender de serviços externos.
- A autenticação será testada pela fronteira de acesso: e-mail permitido entra; e-mail fora da allowlist não cria perfil; sessão revogada deixa de acessar dados.
- A triagem será testada por estados observáveis: dados ausentes, sem consentimento ou de baixa qualidade limitam apenas as dimensões correspondentes; completar a Avaliação Corporal Inicial habilita capacidades; risco sistêmico pode limitar o plano inteiro.
- O planejamento será testado garantindo bloco estável, justificativas visíveis, respeito a equipamentos/limitações e versionamento ao mudar.
- A sessão será testada ponta a ponta para registro de séries, timer, ajustes locais, substituição, abandono e conclusão.
- O comportamento offline será testado desligando a rede durante a sessão, verificando continuidade local, indicação de degradação, fila idempotente e reconciliação sem duplicação.
- Conflitos de sincronização serão testados pela resposta pública: resolução segura quando possível e solicitação humana quando ambígua.
- Nutrição será testada com cardápio, confirmação de consumo, desvio, Troca Equivalente e recálculo do restante do dia dentro das tolerâncias declaradas.
- Os métodos de entrada por IA (texto e foto) e o scanner serão testados na costura da jornada com provedores falsos por contrato: o teste verifica o funil estimativa → confirmação item a item → Consumo Confirmado com proveniência/confiança, e a degradação segura em falha do provedor; a acurácia dos modelos reais não é alegada pelos testes do app.
- A Importação de Histórico será testada pelo funil observável: consentimento antes do envio, interpretação com estimativas marcadas, confirmação item a item, proveniência `importado/estimado` nos dados aceitos e descarte limpo dos rejeitados.
- A Mídia de Execução será testada pelo comportamento observável: exercício com mídia exibe demonstração inclusive offline; exercício sem mídia exibe o fallback de instruções e músculos-alvo.
- Os Ajustes Auto-aplicados da Revisão Semanal serão testados nos dois lados da fronteira: ajuste dentro dos limites versionados aplica sem aprovação e permite desfazer; mudança estrutural nunca auto-aplica e exige aprovação explícita.
- Proveniência nutricional será testada observando fonte/confiança e a escolha ponderada diante de valores conflitantes.
- Cadência Adaptativa será testada com passagem de tempo e histórico variável, garantindo peso no máximo diário, cintura no máximo semanal, conjunto completo/fotos no máximo mensal e redução por ansiedade.
- O protocolo de circunferências será testado com leituras concordantes, terceira leitura por divergência, mediana, assimetria dentro da tolerância e mudança súbita com sintomas acionando segurança.
- Tendências serão testadas com séries contendo flutuações diárias, métodos de gordura diferentes e dados conflitantes, garantindo que medição isolada ou troca de método não gere mudança estrutural.
- Análise visual será testada no nível do contrato com saídas sintéticas: faixa, critérios separados, incerteza e exigência de triangulação; a acurácia de um modelo visual real não será alegada pelo teste do app.
- A Revisão Semanal será testada com cenários de progresso, estagnação, baixa aderência, recuperação ruim e dados insuficientes, observando Scorecard, confiança e ação proposta.
- Experimentos serão testados por criação versionada, alteração limitada, janela mínima, interrupção e rollback ao Plano Estável sem apagar histórico.
- Segurança terá cenários obrigatórios para cada nível: alerta moderado com override auditado e alto risco sem override nem instrução de continuação.
- Toda saída de IA capaz de virar ação passará por testes de contrato e validação: saída inválida, indisponibilidade, timeout e conteúdo proibido devem degradar com segurança.
- Consentimento será testado na fronteira de envio: sem consentimento específico o dado sensível não é encaminhado; consentimento registra finalidade; revogação impede novos envios.
- Exportação e exclusão verificarão o resultado observável nos dados acessíveis, objetos privados e sessões, respeitando retenções legais/técnicas documentadas.
- Auditoria será testada garantindo que uma decisão possa ser explicada por dados, versões, regra/modelo e fontes, sem exigir raciocínio interno do modelo.
- Storage privado será testado garantindo acesso autorizado e expiração/negação de links; URLs públicas permanentes para fotos devem falhar.
- Logs serão verificados por testes de redaction em eventos de erro representativos, impedindo presença de fotos, tokens, e-mail e conteúdo clínico bruto.
- Backups e restauração terão ensaio operacional periódico com evidência de recuperação, não apenas teste de que um job foi disparado.
- Testes diretos abaixo do seam principal serão reservados para algoritmos determinísticos com matriz combinatória ampla: progressão, equivalência nutricional, score de evidência, médias/tendências, scorecard, classificação de segurança e merge idempotente offline.
- Esses testes diretos usarão propriedades e tabelas de decisão, verificando invariantes do domínio, não linhas ou funções privadas.
- Como o repositório é novo, não há prior art interno. A primeira implementação estabelecerá helpers de jornada reutilizáveis; novos testes deverão preferi-los em vez de criar seams adicionais.
- Testes E2E reais em navegador deverão cobrir viewport mobile e serem gravados em vídeo como evidência durante validação, conforme o processo de automação web do projeto.
- Critério de sucesso do MVP em uso real por 8–12 semanas: registros e sessões com aderência alta o suficiente para análise; progressão nos exercícios-chave; tendência corporal coerente com a fase; recuperação sem deterioração persistente; recomendações avaliadas como úteis; ausência de incidentes de segurança atribuíveis a automação.

## Out of Scope

- Cadastro público, múltiplos usuários, cobrança, planos, equipes ou marketplace de profissionais.
- Supervisão integrada por médico, nutricionista, fisioterapeuta ou personal trainer.
- Promessa de resultado físico específico ou prazo garantido.
- Definição de competição, federação, categoria ou data de estreia nesta fase.
- Preparação final de palco, peak week agressiva, manipulação extrema de água/sódio ou desidratação.
- Prescrição, dose ou protocolo de esteroides, SARMs, hormônios, diuréticos, drogas ou outras substâncias de risco clínico.
- Diagnóstico, tratamento, interpretação clínica conclusiva de exames ou atendimento de emergência.
- Análise biomecânica por câmera ou correção de execução em vídeo ao vivo.
- Percentual de gordura apresentado como valor exato derivado de fotografia.
- Open Wearables e integração efetiva com wearables no MVP; apenas a fronteira arquitetural será preservada.
- Pesquisa web dinâmica via Tavily influenciando decisões em produção no MVP.
- Importação ampla de receitas de fontes externas no MVP.
- Modelo generativo executado no dispositivo; o modo offline usa regras locais determinísticas.
- Microfone continuamente ativo ou gravação ambiental da academia.
- Aplicativos nativos para iOS/Android ou acesso direto a HealthKit/Health Connect.
- Feed social, comparação com outros atletas, rankings ou gamificação competitiva.
- Nota única e supostamente objetiva de “qualidade do físico”, fórmula universal de “corpo perfeito” ou promessa de medidas ideais; critérios e Metas de Proporção Corporal permanecerão separados, personalizados e incertos.
- Otimização baseada exclusivamente em peso, foto, wearable ou qualquer sinal isolado.
- Autoaprovação de novos protocolos encontrados na web.

## Further Notes

- Termos canônicos do domínio: **Modo Conservador**, **Plano Ativo**, **Bloco de Treino**, **Sessão de Treino**, **Copiloto de Sessão**, **Coach Local**, **Cardápio Diário**, **Troca Equivalente**, **Cadência Adaptativa**, **Revisão Semanal**, **Scorecard de Progresso**, **Experimento de Plano**, **Plano Estável**, **Trilha de Decisão**, **Alerta de Cautela**, **Bloqueio de Alto Risco**, **Início**, **Diário**, **Progresso**, **Mais**, **Entrada Planejada**, **Consumo Confirmado**, **Prato**, **Atalhos de Registro**, **Check-in Diário**, **Avaliação Corporal Inicial**, **Medição de Gordura Corporal**, **Meta de Proporção Corporal**, **Importação de Histórico**, **Mídia de Execução** e **Ajuste Auto-aplicado**. O glossário em `CONTEXT.md` é a referência; substituições devem ser registradas lá.
- “Maior velocidade dentro de limites seguros” significa acelerar somente enquanto aderência, recuperação, desempenho e tendência corporal permanecem aceitáveis. Não significa minimizar prazo a qualquer custo.
- O alvo Men's Physique orienta proporções e construção de base, mas resultados são limitados por estrutura óssea, genética, experiência, rotina e aderência.
- A fase de base precede a escolha de evento. O app poderá futuramente sugerir critérios de prontidão, sem prometer elegibilidade competitiva.
- Métricas e faixas específicas deverão ser calibradas com protocolos versionados e fontes primárias respeitadas antes da implementação do motor; números clínicos não devem ser inventados durante o desenvolvimento.
- A conveniência foi priorizada, mas não elimina controles mínimos: consentimento por operação para dados sensíveis externos, storage privado, logs minimizados, backups externos e bloqueio de alto risco são requisitos.
- A especificação descreve comportamento esperado, não aconselhamento médico ou nutricional individual.
