import {
  dentroDaToleranciaDaRefeicao,
  materializarItemPlanejadoProposto,
} from "@/domain/plano/item-planejado";
import type { PlanoGerado } from "@/domain/plano/tipos";
import { EXERCICIOS } from "@/domain/plano/exercicios";
import type { ContextoDoAtleta } from "../contexto/montagem";
import { gerarPlanoTreinoComIA, type PlanoTreinoGerado } from "./plano-treino";
import { gerarPlanoNutricaoComIA, type PlanoNutricaoGerado } from "./plano-nutricao";
import type { EntradaPlano } from "./plano-dados";

/**
 * Plano inicial = duas decisões independentes, geradas em paralelo.
 *
 * Treino e nutrição não dependem um do outro, e mantê-los na mesma
 * chamada custava caro: a nutrição atravessava o mesmo laço de
 * geração do bloco de treino sem nada a ganhar com isso. Separadas,
 * cada uma tem seu recorte, sua instrução e sua linha na Trilha de
 * Decisão — e o tempo total passa a ser o da mais lenta, não a soma.
 *
 * Se qualquer uma indisponibilizar, o plano inteiro é indisponível:
 * meio plano não é um plano (o motor local nunca preenche a lacuna).
 */

export type { EntradaPlano as EntradaPlanoInicial };
export { montarDadosPlano as montarDadosPlanoInicial } from "./plano-dados";

export type ResultadoPlanoInicial =
  | { status: "ok"; valor: PlanoGerado; contexto: ContextoDoAtleta; modeloResolvido: string; degradado: boolean }
  | { status: "indisponivel"; contexto: ContextoDoAtleta; motivo: string };

export async function gerarPlanoInicialComIA(
  entrada: EntradaPlano,
): Promise<ResultadoPlanoInicial> {
  const [treino, nutricao] = await Promise.all([
    gerarPlanoTreinoComIA(entrada),
    gerarPlanoNutricaoComIA(entrada),
  ]);

  if (treino.status === "indisponivel") return treino;
  if (nutricao.status === "indisponivel") return nutricao;

  const valor = montarPlano(treino.valor, nutricao.valor, nutricao.modeloResolvido);
  const incoerente = valor.nutricao.refeicoes.some((refeicao) =>
    !dentroDaToleranciaDaRefeicao(
      refeicao.itens.filter((item) => typeof item !== "string"),
      refeicao,
    ),
  );
  // O schema já exige a tolerância sobre a proposta. Esta segunda
  // defesa roda depois de substituir correspondências exatas pelos
  // números da tabela — a verdade da base pode revelar que a
  // composição proposta não cumpre a meta, e nesse caso o plano não é
  // persistido nem ativado.
  if (incoerente) {
    return {
      status: "indisponivel",
      contexto: nutricao.contexto,
      motivo: "A composição dos alimentos não ficou coerente com as metas da refeição.",
    };
  }

  return {
    status: "ok",
    valor,
    contexto: treino.contexto,
    modeloResolvido: treino.modeloResolvido,
    degradado: treino.degradado || nutricao.degradado,
  };
}

/**
 * A `justificativa` de cada exercício vem do catálogo, não do agent.
 * Ela descreve o exercício em abstrato e é estável por definição; o
 * texto personalizado que as telas mostram é `explicacao.porque`.
 * Pedir as duas ao modelo produzia a mesma ideia escrita duas vezes.
 */
function montarPlano(
  treino: PlanoTreinoGerado,
  nutricao: PlanoNutricaoGerado,
  modeloNutricional: string,
): PlanoGerado {
  return {
    regraVersao: treino.regraVersao,
    modoConservador: treino.modoConservador,
    prioridadesCorporais: treino.prioridadesCorporais,
    perfilVersao: treino.perfilVersao,
    bloco: {
      ...treino.bloco,
      dias: treino.bloco.dias.map((dia) => ({
        ...dia,
        exercicios: dia.exercicios.map((exercicio) => ({
          ...exercicio,
          justificativa:
            EXERCICIOS.find((item) => item.id === exercicio.exercicioId)?.justificativa ?? "",
        })),
      })),
    },
    nutricao: {
      ...nutricao.nutricao,
      refeicoes: nutricao.nutricao.refeicoes.map((refeicao) => ({
        ...refeicao,
        itens: refeicao.itens.map((item) =>
          materializarItemPlanejadoProposto(item, modeloNutricional),
        ),
      })),
    },
    dadosUsados: [...new Set([...treino.dadosUsados, ...nutricao.dadosUsados])],
  };
}
