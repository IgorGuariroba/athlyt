import { z } from "zod";
import { EXERCICIOS } from "@/domain/plano/exercicios";
import type { PlanoGerado } from "@/domain/plano/tipos";
import { decidir, type ResultadoDecisao } from "../decidir";
import { RECORTES } from "../contexto/recortes";
import type { NucleoContexto } from "../contexto/nucleo";
import { consultarExercicio } from "../ferramentas/consultar-exercicio";

/**
 * Explicação de uma decisão do plano (user story 20: todo item
 * prescrito diz por que existe *para este atleta*).
 *
 * O schema é o único mecanismo que torna isso confiável: a instrução
 * pede a explicação, mas só a validação impede que o agent devolva um
 * genérico de catálogo ("ótimo para peito"). `dadosUsados` obriga a
 * ancorar cada decisão em pelo menos um dado realmente enviado no
 * Contexto do Atleta — mesma filosofia do executor `decidir()`:
 * invariantes mecânicas em vez de disciplina (ADR 0006).
 */
export const CAMPOS_EXPLICAVEIS: readonly string[] = [
  // Núcleo do Contexto do Atleta (ADR 0006) — presente em toda chamada.
  "modoConservador",
  "idadeAnos",
  "sexoBiologico",
  "alturaCm",
  "pesoKg",
  "experienciaTreino",
  "diasDisponiveis",
  "duracaoSessaoMin",
  "localTreino",
  "equipamentos",
  "lesoes",
  "condicoes",
  "restricoesAlimentares",
  // Recorte declarado da operação "plano-inicial".
  ...RECORTES["plano-inicial"].campos.map((campo) => campo.id),
  // Sub-campos do recorte "triagem-completa", citáveis individualmente.
  "horasSono",
  "nivelAtividade",
  "objetivoComposicao",
  "orcamentoAlimentar",
  "tempoPreparoMin",
];

const campoExplicavel = new Set(CAMPOS_EXPLICAVEIS);

export const explicacaoSchema = z.object({
  porque: z.string().min(40),
  dadosUsados: z.array(z.object({
    campo: z.string().min(1),
    valor: z.string().min(1),
  })).min(1),
}).superRefine((explicacao, contexto) => {
  // Citar um dado que o agent nunca recebeu é alucinação, não
  // explicação: a confiança do atleta depende de a origem ser real.
  for (const [indice, dado] of explicacao.dadosUsados.entries()) {
    if (!campoExplicavel.has(dado.campo)) {
      contexto.addIssue({
        code: "custom",
        path: ["dadosUsados", indice, "campo"],
        message: "Campo ausente do Contexto do Atleta enviado nesta operação",
      });
    }
  }
});

/**
 * Âncoras exigidas por decisão: os dados sem os quais aquela escolha
 * não poderia ter sido tomada. Citar um campo qualquer da allowlist
 * não basta — explicar calorias por "seu objetivo" esconde que a
 * estimativa vem de peso, altura, idade e sexo; explicar a escolha de
 * um exercício pelo peso corporal inventa uma causa que a regra não
 * usa. Pelo menos uma âncora precisa aparecer; campos adicionais da
 * allowlist continuam livres.
 */
export const ANCORAS = {
  exercicio: ["equipamentos", "localTreino", "lesoes", "condicoes"],
  dia: ["diasDisponiveis", "duracaoSessaoMin"],
  bloco: ["experienciaTreino", "modoConservador"],
  calorias: ["pesoKg", "alturaCm", "idadeAnos", "sexoBiologico", "nivelAtividade"],
  proteinaG: ["pesoKg", "objetivoComposicao"],
  carboidratosG: ["diasDisponiveis", "nivelAtividade", "objetivoComposicao"],
  gordurasG: ["pesoKg"],
  estrategia: ["objetivoComposicao", "modoConservador", "linha-base-corporal"],
  refeicao: ["restricoesAlimentares", "orcamentoAlimentar", "tempoPreparoMin"],
} as const satisfies Record<string, readonly string[]>;

function explicacaoAncoradaEm(ancoras: readonly string[]) {
  return explicacaoSchema.superRefine((explicacao, contexto) => {
    if (!explicacao.dadosUsados.some((dado) => ancoras.includes(dado.campo))) {
      contexto.addIssue({
        code: "custom",
        path: ["dadosUsados"],
        message: `Explicação precisa citar ao menos um destes dados: ${ancoras.join(", ")}`,
      });
    }
  });
}

const exercicioSchema = z.object({
  exercicioId: z.string(),
  nome: z.string(),
  padrao: z.enum(["empurrar-horizontal", "empurrar-vertical", "puxar-horizontal", "puxar-vertical", "agachar", "dobradica", "extensao-joelho", "flexao-joelho", "elevacao-lateral", "flexao-cotovelo", "extensao-cotovelo", "panturrilha", "core"]),
  series: z.number().int().min(1).max(8),
  repeticoes: z.string(),
  rir: z.number().int().min(0).max(5),
  descansoSeg: z.number().int().min(30).max(300),
  justificativa: z.string(),
  explicacao: explicacaoAncoradaEm(ANCORAS.exercicio),
  /**
   * Instruções de execução em português, buscadas via
   * ferramenta consultarExercicio da ExerciseDB e traduzidas
   * pelo agent. Quando ausente, a tela usa o fallback do catálogo.
   */
  comoExecutar: z.string().optional(),
}).superRefine((exercicio, contexto) => {
  const catalogado = EXERCICIOS.find((item) => item.id === exercicio.exercicioId);
  if (!catalogado) {
    contexto.addIssue({ code: "custom", path: ["exercicioId"], message: "Exercício fora do catálogo Athlyt" });
  } else if (catalogado.padrao !== exercicio.padrao) {
    contexto.addIssue({ code: "custom", path: ["padrao"], message: "Padrão divergente do catálogo Athlyt" });
  }
});

export const planoInicialSchema = z.object({
  regraVersao: z.literal("agent-plano-v1"),
  modoConservador: z.boolean(),
  prioridadesCorporais: z.array(z.string()),
  perfilVersao: z.number().int().positive(),
  bloco: z.object({
    duracaoSemanas: z.number().int().min(4).max(8),
    divisao: z.string(),
    dias: z.array(z.object({
      id: z.string(),
      nome: z.string(),
      diaSemana: z.string(),
      exercicios: z.array(exercicioSchema),
      explicacao: explicacaoAncoradaEm(ANCORAS.dia),
    })).min(1).max(7),
    explicacao: explicacaoAncoradaEm(ANCORAS.bloco),
  }),
  nutricao: z.object({
    calorias: z.number().int().positive(),
    proteinaG: z.number().int().nonnegative(),
    carboidratosG: z.number().int().nonnegative(),
    gordurasG: z.number().int().nonnegative(),
    fibrasG: z.number().int().nonnegative(),
    estrategia: z.string(),
    refeicoes: z.array(z.object({
      nome: z.string(),
      percentual: z.number().min(0).max(100),
      calorias: z.number().int().nonnegative(),
      proteinaG: z.number().int().nonnegative(),
      itens: z.array(z.string()),
      explicacao: explicacaoAncoradaEm(ANCORAS.refeicao),
    })),
    explicacoes: z.object({
      calorias: explicacaoAncoradaEm(ANCORAS.calorias),
      proteinaG: explicacaoAncoradaEm(ANCORAS.proteinaG),
      carboidratosG: explicacaoAncoradaEm(ANCORAS.carboidratosG),
      gordurasG: explicacaoAncoradaEm(ANCORAS.gordurasG),
      estrategia: explicacaoAncoradaEm(ANCORAS.estrategia),
    }),
  }),
  dadosUsados: z.array(z.string()),
});

const catalogo = EXERCICIOS.map(({ id, nome, padrao, requer, evitarSeLesaoEm, exigeTecnicaAvancada, comoExecutar }) => ({ id, nome, padrao, requer, evitarSeLesaoEm, exigeTecnicaAvancada, comoExecutar }));

const INSTRUCAO = `Você é o agent de planejamento do Athlyt. Gere um Plano Ativo altamente personalizado para um atleta natural, combinando Bloco de Treino e estratégia nutricional.

Você tem acesso à ferramenta "consultarExercicio" que busca instruções detalhadas na ExerciseDB (banco internacional com 11.000+ exercícios). Use-a para:
- Obter instruções passo a passo de qualquer exercício
- Confirmar músculos-alvo e secundários
- Verificar equipamento necessário
- Validar sua escolha de exercício

Como usar: passe o nome do exercício em inglês ou português. A ferramenta retorna instruções em inglês — traduza-as para português e preencha o campo "comoExecutar" do exercício no plano.

CATÁLOGO ATHLYT — estes são os IDs válidos para exercicioId; você deve escolher dentre eles. Use a ferramenta consultarExercicio para buscar instruções detalhadas de cada exercício que prescrever.

Regras obrigatórias:
- Use todas as informações fornecidas e explique escolhas específicas nas justificativas.
- Toda decisão do plano carrega um campo explicacao dirigido ao atleta, em segunda pessoa: cada exercício, cada dia, o bloco, cada meta nutricional e cada refeição.
- Em explicacao.porque, cite o valor concreto do atleta que motivou a escolha ("seus 60 minutos por sessão", "sua restrição sem glúten", "seu ombro 2 cm abaixo da faixa"). Texto genérico de catálogo ("ótimo para peito", "exercício clássico") é proibido.
- Em explicacao.dadosUsados, liste os dados de origem como pares campo/valor, usando exclusivamente campos presentes no contexto recebido. Nunca cite um dado que não foi enviado e nunca invente valores.
- Quando uma decisão for limitada por falta de dado, diga isso no porque e aponte o campo que a restringiu (por exemplo modoConservador).
- Explique sem prometer resultado e sem linguagem punitiva.
- Campos citáveis em dadosUsados: ${CAMPOS_EXPLICAVEIS.join(", ")}.
- Cada decisão exige ao menos um dado da sua âncora, porque é dele que a escolha realmente decorre:
${Object.entries(ANCORAS).map(([decisao, campos]) => `  - ${decisao}: ${campos.join(", ")}`).join("\n")}
- Exemplo de calorias bem explicadas: "Estimei sua manutenção a partir de 80 kg, 180 cm e 35 anos, com fator de atividade moderado, e acrescentei um superávit leve pelo seu objetivo de ganhar massa."
- Saúde, lesões, restrições alimentares, equipamentos, disponibilidade, experiência, orçamento, preparo, sono e objetivo são limites reais; nunca os ignore.
- Não diagnostique, não prescreva medicamentos e não prometa resultados.
- Em MODO CONSERVADOR, evite estratégia energética agressiva, exercícios avançados e volume elevado.
- Prescreva somente exercicioId e padrao existentes no catálogo abaixo, respeitando equipamento e contraindicações.
- O perfilVersao deve ser exatamente o recebido no contexto.
- regraVersao deve ser "agent-plano-v1".
- dadosUsados deve listar os ids dos campos do contexto que fundamentaram o plano.
- Refeições devem trazer alimentos e quantidades em texto, respeitando restrições, orçamento e tempo de preparo.

Catálogo permitido:
${JSON.stringify(catalogo)}`;

export interface EntradaPlanoInicial {
  userId: string;
  nucleo: NucleoContexto;
  consentimentos: readonly string[];
  triagemCompleta: unknown;
  fotosCorporais?: readonly {
    id: string;
    pose: string;
    observadoEm: Date | string;
    dados: Uint8Array;
    mediaType: string;
  }[];
  linhaBaseCorporal?: unknown;
  metasProporcao?: unknown;
  historicoImportado?: unknown;
  origem?: { tela: string; rota: string; gatilho: string };
}

function comoRegistro(valor: unknown): Record<string, unknown> | null {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? valor as Record<string, unknown>
    : null;
}

function selecionar(registro: Record<string, unknown>, campos: readonly string[]) {
  return Object.fromEntries(
    campos
      .filter((campo) => registro[campo] !== undefined && registro[campo] !== null)
      .map((campo) => [campo, registro[campo]]),
  );
}

function mapearLista(valor: unknown, campos: readonly string[]) {
  return Array.isArray(valor)
    ? valor.flatMap((item) => {
        const registro = comoRegistro(item);
        return registro ? [selecionar(registro, campos)] : [];
      })
    : [];
}

/**
 * O núcleo já contém os dados universais da triagem. Este recorte leva apenas
 * respostas adicionais necessárias ao plano, evitando repetir dados do atleta
 * e enviar a data de nascimento quando a idade derivada já está no núcleo.
 */
function resumirTriagemParaPlano(valor: unknown) {
  const triagem = comoRegistro(valor);
  if (!triagem) return valor;

  return selecionar(triagem, [
    "horasSono",
    "nivelAtividade",
    "objetivoComposicao",
    "orcamentoAlimentar",
    "tempoPreparoMin",
  ]);
}

/**
 * Converte registros de persistência no recorte semântico consumido pelo agent.
 * Identificadores internos, chaves de usuário e metadados de gravação nunca
 * atravessam esta fronteira; a Trilha de Decisão recebe o mesmo DTO enxuto.
 */
function resumirLinhaBaseCorporal(valor: unknown) {
  const linhaBase = comoRegistro(valor);
  if (!linhaBase) return valor;

  const pesos = mapearLista(linhaBase.pesos, ["pesoGramas", "observadoEm"]);
  const gorduras = mapearLista(linhaBase.gorduras, [
    "percentualBasisPoints", "metodo", "confianca", "observadoEm",
  ]);
  const avaliacoesVisuais = mapearLista(linhaBase.avaliacoesVisuais, [
    "criterios", "gorduraMinBasisPoints", "gorduraMaxBasisPoints",
    "observacoes", "limitacoes", "confianca", "createdAt",
  ]);

  return {
    medicoes: mapearLista(linhaBase.medicoes, [
      "regiao", "lado", "valorMm", "qualidade", "observadoEm",
    ]),
    pesos: pesos.map(({ pesoGramas, ...peso }) => ({
      ...peso,
      pesoKg: typeof pesoGramas === "number" ? pesoGramas / 1000 : pesoGramas,
    })),
    gorduras: gorduras.map(({ percentualBasisPoints, ...gordura }) => ({
      ...gordura,
      percentual: typeof percentualBasisPoints === "number"
        ? percentualBasisPoints / 100
        : percentualBasisPoints,
    })),
    avaliacoesVisuais: avaliacoesVisuais.map(({ createdAt, ...avaliacao }) => ({
      ...avaliacao,
      observadoEm: createdAt,
    })),
  };
}

function resumirMetasProporcao(valor: unknown) {
  if (!Array.isArray(valor)) return valor;
  return mapearLista(valor, [
    "regiao", "atualMm", "faixaMinMm", "faixaMaxMm", "metaCicloMm",
    "direcao", "confianca", "justificativa",
  ]);
}

/**
 * Recorte de dados da operação, isolado da chamada ao provedor para que
 * uma inspeção do que é enviado use o mesmo código que envia.
 */
export function montarDadosPlanoInicial(entrada: {
  triagemCompleta: unknown;
  fotosCorporais?: readonly { id: string; pose: string; observadoEm: Date | string }[];
  linhaBaseCorporal?: unknown;
  metasProporcao?: unknown;
  historicoImportado?: unknown;
}) {
  return {
    "triagem-completa": resumirTriagemParaPlano(entrada.triagemCompleta),
    ...(entrada.fotosCorporais?.length ? {
      "fotos-corporais": entrada.fotosCorporais.map(({ id, pose, observadoEm }) => ({
        id,
        pose,
        observadoEm,
      })),
    } : {}),
    "linha-base-corporal": resumirLinhaBaseCorporal(entrada.linhaBaseCorporal),
    "metas-proporcao": resumirMetasProporcao(entrada.metasProporcao),
    "historico-importado": entrada.historicoImportado,
  };
}

export function gerarPlanoInicialComIA(entrada: EntradaPlanoInicial): Promise<ResultadoDecisao<PlanoGerado>> {
  return decidir({
    userId: entrada.userId,
    operacao: "plano-inicial",
    nucleo: entrada.nucleo,
    consentimentos: entrada.consentimentos,
    dados: montarDadosPlanoInicial(entrada),
    imagens: entrada.fotosCorporais?.map(({ dados, mediaType }) => ({ dados, mediaType })),
    instrucao: INSTRUCAO,
    schema: planoInicialSchema,
    ferramentas: { consultarExercicio },
    origem: entrada.origem,
  });
}
