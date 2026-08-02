# Implementação — Avaliação Corporal e personalização

Estado: jornada funcional completa implementada e validada

## Objetivo

Entregar a jornada completa Avaliação Corporal Inicial → qualidade/confiança → plano personalizado → acompanhamento → revisão, preservando saúde, consentimento, proveniência e estabilidade do Plano Ativo.

## Plano integrado em 10 passos

1. ✅ **Persistência** — medições corporais, peso, gordura, avaliações, fotos e Metas de Proporção Corporal, com migration `0009`.
2. ✅ **Domínio de medições** — consolidação de leituras, qualidade, simetria, cadência e cautela atrás do módulo `medicoes`.
3. ✅ **Avaliação Corporal Inicial** — subfluxo progressivo entre peso e objetivo, com salvar ou adiar. Fotos usam Cloudflare R2 privado quando configurado e falham fechado sem credenciais.
4. ✅ **Modo Conservador granular** — confiança por composição, proporções, simetria, treino, nutrição e saúde/recuperação.
5. ✅ **Início** — pendências explicadas por benefício, sem bloquear capacidades confiáveis.
6. ✅ **Check-in e cadência** — registro avulso de peso, cintura e gordura; limites diário/semanal/mensal no domínio.
7. ✅ **Metas de Proporção Corporal** — metodologia versionada de trajetória, meta do ciclo, direção, confiança e preferências de ênfase.
8. ✅ **Personalização do plano e IA** — treino e nutrição usam confiança/metas; recortes de IA foram versionados e a Trilha registra `motor-plano-v2`. A geração continua híbrida com decisão determinística vigente; não foi criada uma chamada generativa fictícia.
9. ✅ **Progresso e revisão** — Progresso mostra metas, gordura separada por método, trajetória e preferências; mudanças estruturais continuam exigindo o fluxo de revisão já especificado e não são autoaplicadas.
10. ✅ **Verificação** — testes unitários e integração, R2 real, E2E mobile de upload/leitura privada com vídeo, lint, typecheck e build. Fotos de teste e usuários E2E são removidos após a validação.

## Fechamento da jornada completa

- ✅ Avaliação visual multimodal com consentimento específico, critérios separados, faixa probabilística de gordura, projeção versionada e Trilha de Decisão.
- ✅ Comparativo privado por mesma pose, datas, zoom e alerta de condições divergentes.
- ✅ Gráficos de peso, cintura e gordura separados por método/protocolo.
- ✅ Revisão Semanal guiada: planejado vs realizado, Scorecard, evidências e proposta conservadora.
- ✅ Proposta estrutural vira rascunho; Experimento de Plano preserva baseline e rollback cria nova versão.
- ✅ Revogação independente de storage e IA, exclusão individual/em lote, retenção operacional e exportação JSON.
- ✅ Verificação real da IA visual com imagens sintéticas, sem persistir as imagens.

## Critérios globais

- Plano inicial não é bloqueado pela avaliação incompleta.
- Nenhuma medição isolada ou troca de método altera estrutura do plano.
- Fotos não produzem percentual exato e não são enviadas fora da operação pertinente.
- Saúde e segurança prevalecem sobre preferências estéticas.
- Metodologias, recortes e decisões são versionados.
