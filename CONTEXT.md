# Athlyt

Coach adaptativo pessoal (PWA mobile-first) para treino, alimentação e evolução corporal rumo a uma base natural de Men's Physique. Fecha o ciclo medir → planejar → executar → registrar → revisar → ajustar.

## Language

### Navegação e superfícies

**Início**:
Aba-dashboard orientada à próxima ação do ciclo, composta por cartões personalizáveis ordenados por prioridade (treino do dia, check-in, próxima refeição, macros, revisão).
_Avoid_: Home, dashboard, hoje

**Diário**:
Aba com a linha do tempo unificada do dia — refeições planejadas e confirmadas, sessões de treino, check-ins e medições — com botão de registro rápido.
_Avoid_: Log, timeline, registro

**Progresso**:
Aba que combina o cartão de estratégia (Plano Ativo, contagem até a Revisão Semanal, Experimento em andamento) com gráficos configuráveis de força, tendência corporal, volume e fotos.
_Avoid_: Evolução, relatórios, histórico

**Mais**:
Aba de perfil, plano/estratégia detalhada, academia/equipamentos, Trilhas de Decisão, consentimentos e configurações.
_Avoid_: Menu, ajustes, perfil (como nome de aba)

### Ciclo e planejamento

**Modo Conservador**:
Estado explícito e granular derivado da insuficiência, falta de consentimento ou baixa qualidade dos dados do atleta. Restringe somente as dimensões afetadas — composição corporal, proporções, simetria bilateral, treinamento, nutrição ou saúde e recuperação — salvo quando um risco de saúde exigir limitação do plano inteiro.

**Plano Ativo**:
Versão imutável vigente do conjunto Bloco de Treino + estratégia nutricional + regras de cadência. Novas decisões criam versões, nunca sobrescrevem.

**Plano Estável**:
Última versão do plano considerada segura e conhecida, alvo de rollback quando um Experimento de Plano falha.

**Reavaliação Pendente**:
Estado aberto quando uma mudança relevante no Contexto do Atleta — como objetivo, disponibilidade, equipamentos ou restrições — pode exigir mudança estrutural. O Plano Ativo permanece vigente até que a Reavaliação Pendente seja incorporada à Revisão Semanal e resulte em manutenção ou em um Experimento de Plano aprovado.
_Avoid_: Plano desatualizado, troca automática de plano

**Bloco de Treino**:
Estrutura de treino estável por quatro a oito semanas: frequência, divisão, exercícios, séries, faixas de repetição, RIR e descansos.

**Cardápio Diário**:
Prescrição alimentar do dia com refeições, alimentos, quantidades e metas de energia e macronutrientes, materializada como entradas planejadas na linha do tempo do Diário.
_Avoid_: Dieta, meal plan

**Revisão Semanal**:
Evento semanal guiado (3–5 telas) que compara planejado, realizado e resposta corporal, produz o Scorecard de Progresso e propõe manutenção, ajuste ou Experimento de Plano.
_Avoid_: Check-in semanal (reservar "check-in" para o diário)

**Scorecard de Progresso**:
Combinação versionada de aderência, desempenho, tendência corporal, recuperação e utilidade das recomendações.

**Experimento de Plano**:
Mudança estrutural versionada com hipótese, baseline, poucas variáveis, janela mínima, critérios de sucesso/interrupção e plano de rollback.

**Ajuste Auto-aplicado**:
Ajuste pequeno da Revisão Semanal aplicado sem aprovação manual, dentro de limites versionados; mudanças estruturais sempre exigem aprovação explícita.

### Execução

**Sessão de Treino**:
Execução registrada de um dia do Bloco de Treino: lista de exercícios, tabela de séries (carga, repetições, RIR), timer de descanso e resumo final.
_Avoid_: Workout, treino (quando se referir ao evento registrado)

**Copiloto de Sessão**:
Orientação contextual durante a Sessão de Treino — IA online, Coach Local offline — para ajustes de carga, repetição e descanso entre séries.

**Coach Local**:
Pacote determinístico e versionado disponível no dispositivo; offline, aplica somente regras auditáveis de baixo risco previamente autorizadas. Toda orientação que ele produz declara origem "regra local" e a versão da regra.

**Outbox**:
Fila local de eventos da Sessão de Treino em IndexedDB. Cada evento tem identificador estável gerado no dispositivo, timestamp do aparelho e ordem lógica, e é reenviado a endpoint idempotente até ser confirmado.
_Avoid_: fila de sincronização, sync queue

**Conflito de Sincronização**:
Divergência entre o que o dispositivo registrou offline e o que o servidor já tem gravado, quando não há resolução segura automática. Fica pendente até escolha explícita do atleta; nada é descartado silenciosamente.

**Mídia de Execução**:
Animação/vídeo demonstrativo do exercício vindo de banco aberto/licenciado hospedado em storage privado, com fallback de instruções em texto e diagrama de músculos-alvo.

**Check-in Diário**:
Ritual único do dia que agrupa o que a Cadência Adaptativa solicitar — peso, prontidão (energia, sono, fadiga, dores, motivação) e, nos dias devidos, circunferências e fotos.
_Avoid_: Morning check-in, daily log

**Cadência Adaptativa**:
Política que decide quando solicitar cada medição (peso no máx. diário, circunferências no máx. semanal, fotos no máx. mensal), reduzindo frequência diante de ansiedade.

**Avaliação Corporal Inicial**:
Estabelecimento da linha de base do atleta por peso; circunferências padronizadas de cintura, pescoço, quadril, tórax, ombros, braços, coxas e panturrilhas; referências estruturais de punho e tornozelo; e fotos comparáveis de frente, costas e laterais. O percentual de gordura é complementar e sempre associado ao método, à data e às condições da medição. Sua ausência não impede um Plano Ativo, mas mantém recomendações dependentes desses dados em Modo Conservador até que a linha de base tenha qualidade suficiente.

**Meta de Proporção Corporal**:
Faixa-alvo personalizada e revisável que combina referências estéticas de Men's Physique com estrutura, preferências e trajetória real do atleta. Distingue a referência de longo prazo da meta do ciclo atual e orienta aumentar, reduzir ou manter medidas sem apresentar um corpo universal como ideal nem prometer que a faixa será atingida. Saúde e segurança são limites obrigatórios: o modelo pode propor caminhos, mas não reinterpretar nem ultrapassar esses limites.
_Avoid_: Medida ideal, corpo perfeito

**Medição de Gordura Corporal**:
Registro de percentual de gordura associado ao método, data, protocolo, equipamento e, quando aplicável, profissional responsável. Sua tendência é comparável prioritariamente dentro do mesmo método e protocolo; uma troca de método não representa, por si só, mudança corporal real. Estimativas visuais são expressas somente como faixa probabilística.
_Avoid_: Percentual exato por foto

### Nutrição

**Prato**:
Área de montagem de múltiplos alimentos com subtotal de energia e macros, registrada de uma vez na linha do tempo.
_Avoid_: Your Plate, cesta

**Entrada Planejada**:
Refeição do Cardápio Diário exibida na linha do tempo em estado planejado, com ações confirmar, editar e trocar.

**Consumo Confirmado**:
Registro do que foi realmente consumido, distinto do planejado; toda estimativa de IA ou base externa exige confirmação item a item antes de virar Consumo Confirmado.

**Troca Equivalente**:
Substituição de refeição/alimento que preserva energia e macros dentro de tolerâncias explícitas, respeitando restrições, custo e preparo.

**Atalhos de Registro**:
Painel com os métodos de entrada alimentar: busca, entrada manual, favoritos/recorrentes, descrição por texto via IA, foto via IA e leitura de código de barras.

**Importação de Histórico**:
Ingestão de histórico prévio de treino e alimentação por texto livre ou arquivos texto/CSV, interpretada por IA e confirmada item a item, com proveniência `importado/estimado`.

### Segurança e auditoria

**Alerta de Cautela**:
Aviso de risco moderado que admite override explícito e auditado.

**Bloqueio de Alto Risco**:
Interrupção sem override das recomendações diante de sintomas de alto risco; exibe somente orientação de interromper e procurar atendimento.

**Trilha de Decisão**:
Registro explicável de uma decisão do sistema: dados usados, qualidade, regra/cálculo ou modelo, versões, fontes, riscos e resultado.

### Contexto de IA

**Contexto do Atleta**:
Projeção derivada e versionada do estado do usuário enviada ao modelo em cada decisão, composta pelo Núcleo mais um Recorte de Contexto. Não é dump do banco nem subconjunto "seguro": inclui dado sensível quando ele for pertinente à operação.
_Avoid_: Prompt, contexto (isolado), payload

**Núcleo**:
Parte do Contexto do Atleta presente em toda chamada — objetivo, fase, Plano Ativo, Modo Conservador, restrições, lesões ativas e equipamentos — suficiente para nunca prescrever algo inviável ou inseguro.

**Recorte de Contexto**:
Conjunto versionado de campos que uma operação de IA declara usar, montado sob demanda. Sua declaração de campos é a fonte de verdade do texto de consentimento e do registro na Trilha de Decisão.
_Avoid_: Filtro, subconjunto

**Ferramenta de Leitura**:
Consulta que o modelo invoca durante o raciocínio para obter dado fora do Recorte de Contexto (histórico de um exercício, tendência de peso), com cada chamada registrada na Trilha de Decisão.
_Avoid_: Tool, function call

**Proveniência**:
Marcação de origem e recência de cada valor do Contexto do Atleta — `medido`, `importado` ou `estimado` — usada para ponderar confiança e alimentar o Modo Conservador.
