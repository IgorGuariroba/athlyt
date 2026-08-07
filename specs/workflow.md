# Workflow — Athlyt

Mapa de fluxos do MVP, derivado de `specs/mvp-vertical.md` e das referências em `workflow-imagens-references/` (Alpha Progression, Fitbod, MacroFactor). Cada fluxo é expandido em telas numeradas em `specs/workflow/telas/`, no mesmo padrão das referências. Termos canônicos em `CONTEXT.md`.

## Decisões estruturais

| Decisão | Escolha | Referência-âncora |
|---|---|---|
| Navegação de topo | 4 abas: **Início · Diário · Progresso · Mais** | Alpha (Início/Progresso) + MacroFactor (Dashboard/Diário) |
| Onboarding | Cascata longa, uma pergunta por tela, com barra de progresso | MacroFactor 006–059 |
| Importação de Histórico | Texto livre + arquivos texto/CSV → IA extrai → confirmação item a item; etapa opcional do onboarding e reacessível em Mais | (inédito — sem referência) |
| Nascimento do Plano Ativo | Geração automática pós-triagem + tela de revisão com substituições pré-ativação | Fitbod 020 + Alpha 042–047 |
| Sessão de Treino | Modelo lista do Alpha + Mídia de Execução por exercício do Fitbod | Alpha 049–073 + Fitbod 030–035 |
| Mídia de exercícios | Banco aberto/licenciado em storage privado (offline-first); fallback texto + músculos-alvo | Fitbod 032–035 |
| Diário de nutrição | Linha do tempo do MacroFactor com camada planejado vs confirmado; Prato; Atalhos de Registro completos (busca, manual, favoritos, texto-IA, foto-IA, scanner) | MacroFactor 115–141 |
| Medições | Avaliação Corporal Inicial progressiva + Check-in Diário agrupado via Cadência Adaptativa; cartão no Início + Entrada Planejada no Diário | MacroFactor 016–022 (peso e gordura corporal) |
| Revisão Semanal | Evento guiado 3–5 telas; ajustes pequenos auto-aplicados em limites versionados; estruturais exigem aprovação | MacroFactor 143–146 (Strategy) |
| Progresso | Cartão Strategy (círculo até Revisão + Experimento) sobre gráficos configuráveis; hexágono de volume | MacroFactor 143 + Alpha 084–090 + Fitbod 087–091 |
| Coach IA | Contextual embutido (Sessão, Diário, Revisão, "por quê?" → Trilha de Decisão); sem chat global | (inédito) |
| Início | Cartões personalizáveis, ordem padrão por prioridade da spec | Alpha 081 + MacroFactor 084–096 |

## Fluxos

### A — Acesso e Onboarding (telas 001–028)

Login Google → allowlist (negado = mensagem clara, sem persistência) → triagem em cascata (dados físicos → **Avaliação Corporal Inicial progressiva** → objetivo, experiência, **Importação de Histórico opcional**, disponibilidade, academia/equipamentos, saúde/lesões, alimentação, rotina) → resumo do que falta e do que cada dado destrava por dimensão do Modo Conservador → **geração do Plano Ativo** → revisão (resumo, dia a dia, substituições, estratégia nutricional) → ativação.

A Avaliação Corporal Inicial começa por peso, cintura, pescoço e quadril; as demais circunferências, referências estruturais, fotos e Medição de Gordura Corporal podem ser concluídas depois. Abandono no meio da cascata: o app entra utilizável em Modo Conservador granular; o restante vira cartão de benefício concreto, sem culpa nem nota estética, no Início.

### B — Início (telas 029–031)

Cartões em ordem de prioridade: estado do ciclo/badges (Conservador, offline) → Treino do dia (Iniciar) → Check-in Diário → Próxima refeição (confirmar em 1 toque) → Macros do dia → contagem até a Revisão Semanal → condicionais (completar perfil, conflito de sync, alerta). Ordem/visibilidade personalizáveis.

### C — Sessão de Treino (telas 032–044)

Treino do dia em lista → exercício com tabela de séries (carga | reps | RIR) → Mídia de Execução para dúvidas → registrar série → timer de descanso (overlay + notificação) → sugestões do Copiloto entre séries → substituição preservando estímulo → registro de dor/desconforto → Alerta de Cautela (override auditado) / Bloqueio de Alto Risco (sem override) → conclusão ou abandono com motivo → resumo. Offline: Coach Local, indicação de degradação, fila idempotente.

### D — Diário e Nutrição (telas 045–058)

Linha do tempo do dia com Entradas Planejadas do Cardápio Diário (✓ Confirmar / Editar / Trocar) + painel de macros restantes no topo → Troca Equivalente com tolerâncias → botão **+** abre Atalhos de Registro (busca, manual, favoritos, texto-IA, foto-IA, scanner) → toda estimativa passa por confirmação item a item → Prato para montagem múltipla → recálculo do restante do dia quando material. Desvios sem linguagem punitiva.

### E — Check-in e Medições (telas 059–063)

Check-in Diário agrupado: prontidão (1 toque por dimensão) + peso quando solicitado + cintura no máximo semanalmente + conjunto completo de circunferências e fotos em cadência mensal, salvo redução por ansiedade. Circunferências usam uma leitura por região, apoiada em instrução anatômica que é o que se repete entre medições; leituras adicionais são opcionais e valem pela mediana (ADR 0007). Medições de gordura externas são avulsas, registram método/protocolo e não têm repetição obrigatória. Registro avulso sempre possível pelo +.

### F — Progresso e Revisão Semanal (telas 064–074)

Aba Progresso: cartão Strategy (Plano Ativo, círculo até a Revisão, Experimento em andamento) + Metas de Proporção Corporal (medida atual, faixa de referência de longo prazo, meta do ciclo, direção, confiança e justificativa) + gráficos configuráveis + avaliação visual por critérios separados com faixa probabilística. Revisão Semanal: planejado vs realizado → Scorecard → evidências convergentes ou conflitantes → proposta (auto-aplicada se pequena; aprovação se estrutural/Experimento) → versionamento + Trilha de Decisão. Medição isolada ou troca de método não altera o plano; rollback ao Plano Estável.

### G — Mais (telas 075–085)

Perfil versionado, Importação de Histórico, versões/comparação de planos, Trilhas de Decisão, consentimentos (conceder/revogar), exportação de dados, exclusão de conta, academia/equipamentos, configurações (unidades, notificações, timer, aparência), estado de sincronização e resolução de conflitos.

## Estados transversais

- **Conexão**: online · offline · sincronizando · com conflito · degradado — sempre visíveis (badge no topo).
- **Modo Conservador**: estado granular por composição corporal, proporções, simetria bilateral, treinamento, nutrição e saúde/recuperação; a UI explica a confiança e o dado que destrava cada capacidade. Risco de saúde pode limitar o plano inteiro.
- **Origem da orientação**: toda recomendação indica IA online vs regra local determinística.
- **Segurança**: Alerta de Cautela e Bloqueio de Alto Risco podem interromper qualquer fluxo.
