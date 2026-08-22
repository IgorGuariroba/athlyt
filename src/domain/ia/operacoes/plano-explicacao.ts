import { z } from "zod";
import { RECORTES } from "../contexto/recortes";

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
 *
 * Compartilhado pelas duas operações do plano: treino e nutrição
 * explicam decisões diferentes, mas com a mesma invariante.
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
  // Recortes declarados das operações do plano.
  ...RECORTES["plano-treino"].campos.map((campo) => campo.id),
  ...RECORTES["plano-nutricao"].campos.map((campo) => campo.id),
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
  calorias: ["pesoKg", "alturaCm", "idadeAnos", "sexoBiologico", "nivelAtividade", "linha-base-corporal"],
  proteinaG: ["pesoKg", "objetivoComposicao"],
  carboidratosG: ["diasDisponiveis", "nivelAtividade", "objetivoComposicao"],
  gordurasG: ["pesoKg"],
  estrategia: ["objetivoComposicao", "modoConservador", "linha-base-corporal"],
  refeicao: ["restricoesAlimentares", "orcamentoAlimentar", "tempoPreparoMin"],
} as const satisfies Record<string, readonly string[]>;

export function explicacaoAncoradaEm(ancoras: readonly string[]) {
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

/** Regras de explicação repetidas nas instruções das duas operações. */
export function regrasDeExplicacao(ancoras: Record<string, readonly string[]>): string {
  return [
    "- Toda decisão do plano carrega um campo explicacao dirigido ao atleta, em segunda pessoa.",
    '- Em explicacao.porque, cite o valor concreto do atleta que motivou a escolha ("seus 60 minutos por sessão", "sua restrição sem glúten"). Texto genérico de catálogo é proibido.',
    "- Em explicacao.dadosUsados, liste os dados de origem como pares campo/valor, usando exclusivamente campos presentes no contexto recebido. Nunca cite um dado que não foi enviado e nunca invente valores.",
    "- Quando uma decisão for limitada por falta de dado, diga isso no porque e aponte o campo que a restringiu (por exemplo modoConservador).",
    "- Explique sem prometer resultado e sem linguagem punitiva.",
    `- Campos citáveis em dadosUsados: ${CAMPOS_EXPLICAVEIS.join(", ")}.`,
    "- Cada decisão exige ao menos um dado da sua âncora, porque é dele que a escolha realmente decorre:",
    ...Object.entries(ancoras).map(([decisao, campos]) => `  - ${decisao}: ${campos.join(", ")}`),
  ].join("\n");
}
