import type { OperacaoIA, RecorteDeclarado } from "./tipos";

/**
 * Recortes de Contexto declarados por operação (ADR 0006).
 *
 * A lista de campos aqui é a fonte de verdade de três coisas ao
 * mesmo tempo: o que é enviado ao modelo, o texto de consentimento
 * apresentado ao usuário e o registro na Trilha de Decisão. Divergir
 * qualquer uma das três da declaração é bug, não detalhe.
 *
 * `versao` sobe sempre que os campos mudam — é o que torna uma
 * decisão passada reproduzível.
 */
export const RECORTES: Record<OperacaoIA, RecorteDeclarado> = {
  "copiloto-sessao": {
    operacao: "copiloto-sessao",
    versao: 1,
    finalidade:
      "Orientar carga, repetições, RIR e descanso durante a sessão de treino",
    campos: [
      {
        id: "exercicio",
        descricao: "Exercício em execução e séries já registradas hoje",
        sensivel: false,
      },
      {
        id: "historico-exercicio",
        descricao: "Suas últimas sessões neste mesmo exercício",
        sensivel: false,
      },
      {
        id: "prontidao-hoje",
        descricao: "Energia, sono, fadiga, dores e motivação do check-in de hoje",
        sensivel: true,
      },
      {
        id: "fadiga-semana",
        descricao: "Volume e esforço acumulados na semana",
        sensivel: false,
      },
    ],
  },

  "revisao-semanal": {
    operacao: "revisao-semanal",
    versao: 2,
    finalidade:
      "Avaliar a semana e propor manutenção, ajuste ou Experimento de Plano",
    campos: [
      {
        id: "aderencia-semana",
        descricao: "Sessões e refeições planejadas versus realizadas",
        sensivel: false,
      },
      {
        id: "desempenho-semana",
        descricao: "Progressão de carga e volume por exercício",
        sensivel: false,
      },
      {
        id: "tendencia-corporal",
        descricao: "Tendência de peso e circunferências (médias móveis)",
        sensivel: true,
      },
      {
        id: "metas-proporcao",
        descricao: "Metas do ciclo, confiança, preferências e metodologia versionada",
        sensivel: true,
      },
      {
        id: "conflitos-medicao",
        descricao: "Divergências entre medições sem fundi-las em uma tendência",
        sensivel: true,
      },
      {
        id: "recuperacao",
        descricao: "Prontidão agregada da semana",
        sensivel: true,
      },
      {
        id: "utilidade-recomendacoes",
        descricao: "Quais recomendações anteriores você marcou como úteis",
        sensivel: false,
      },
    ],
  },

  /**
   * O plano inicial é decidido em duas operações independentes, geradas
   * em paralelo: o Bloco de Treino e a estratégia nutricional não dependem
   * um do outro e cada um tem seu próprio recorte declarado.
   */
  "plano-treino": {
    operacao: "plano-treino",
    versao: 1,
    finalidade: "Gerar o Bloco de Treino inicial",
    campos: [
      {
        id: "triagem-completa",
        descricao: "Sono, nível de atividade, objetivo corporal, orçamento e tempo de preparo; dados universais do perfil não são repetidos",
        sensivel: true,
      },
      {
        id: "fotos-corporais",
        descricao: "Até quatro fotos corporais recentes, com pose e data, para contextualizar a composição e as proporções no plano inicial",
        sensivel: true,
      },
      {
        id: "linha-base-corporal",
        descricao: "Circunferências consolidadas, composição corporal, qualidade e recência",
        sensivel: true,
      },
      {
        id: "metas-proporcao",
        descricao: "Metas de Proporção Corporal, preferências e confiança",
        sensivel: true,
      },
      {
        id: "historico-importado",
        descricao: "Histórico de treino e alimentação que você importou",
        sensivel: true,
      },
    ],
  },

  "plano-nutricao": {
    operacao: "plano-nutricao",
    versao: 1,
    finalidade: "Gerar a estratégia nutricional inicial",
    campos: [
      {
        id: "triagem-completa",
        descricao: "Sono, nível de atividade, objetivo corporal, orçamento e tempo de preparo; dados universais do perfil não são repetidos",
        sensivel: true,
      },
      {
        id: "fotos-corporais",
        descricao: "Até quatro fotos corporais recentes, com pose e data, para contextualizar a composição corporal na estratégia energética",
        sensivel: true,
      },
      {
        id: "linha-base-corporal",
        descricao: "Circunferências consolidadas, composição corporal, qualidade e recência",
        sensivel: true,
      },
      {
        id: "metas-proporcao",
        descricao: "Metas de Proporção Corporal, preferências e confiança",
        sensivel: true,
      },
      {
        id: "historico-importado",
        descricao: "Histórico de treino e alimentação que você importou",
        sensivel: true,
      },
    ],
  },

  "refeicao-texto": {
    operacao: "refeicao-texto",
    versao: 1,
    finalidade: "Estimar alimentos e porções a partir da sua descrição",
    campos: [
      {
        id: "descricao-livre",
        descricao: "O texto que você escreveu sobre a refeição",
        sensivel: false,
      },
      {
        id: "metas-restantes",
        descricao: "Energia e macros que ainda faltam hoje",
        sensivel: false,
      },
      {
        id: "restricoes",
        descricao: "Suas restrições e preferências alimentares",
        sensivel: false,
      },
    ],
  },

  "refeicao-foto": {
    operacao: "refeicao-foto",
    versao: 1,
    finalidade: "Estimar alimentos e porções a partir da foto do prato",
    campos: [
      {
        id: "foto-refeicao",
        descricao: "A foto do prato enviada ao provedor de IA",
        sensivel: true,
      },
      {
        id: "metas-restantes",
        descricao: "Energia e macros que ainda faltam hoje",
        sensivel: false,
      },
      {
        id: "restricoes",
        descricao: "Suas restrições e preferências alimentares",
        sensivel: false,
      },
    ],
  },

  "avaliacao-visual": {
    operacao: "avaliacao-visual",
    versao: 1,
    finalidade: "Avaliar proporções e simetria corporal com critérios separados e estimar gordura somente como faixa probabilística",
    campos: [
      { id: "fotos-corporais", descricao: "Fotos corporais privadas selecionadas para esta avaliação visual", sensivel: true },
      { id: "medicoes-comparaveis", descricao: "Circunferências recentes, método, protocolo, qualidade e recência", sensivel: true },
      { id: "condicoes-captura", descricao: "Pose, iluminação, distância e observações das fotos", sensivel: true },
    ],
  },

  "importacao-historico": {
    operacao: "importacao-historico",
    versao: 1,
    finalidade:
      "Extrair dados estruturados do histórico que você colou ou anexou",
    campos: [
      {
        id: "conteudo-bruto",
        descricao: "O texto ou arquivo de histórico enviado ao provedor de IA",
        sensivel: true,
      },
    ],
  },
};

export function obterRecorte(operacao: OperacaoIA): RecorteDeclarado {
  return RECORTES[operacao];
}
