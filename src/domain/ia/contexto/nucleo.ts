import type { RespostasTriagem } from "@/domain/triagem/etapas";
import { rotuloEquipamento } from "@/domain/triagem/equipamentos";
import { avaliarSuficiencia } from "@/domain/triagem/suficiencia";
import { importado, medido, type ValorContexto } from "./tipos";

/**
 * Núcleo do Contexto do Atleta — a parte presente em toda chamada de
 * IA (ADR 0006). É o mínimo para que o modelo nunca prescreva algo
 * inviável (equipamento que não existe) ou inseguro (exercício sobre
 * lesão ativa).
 *
 * Propositalmente pequeno e estável: o que varia por operação
 * pertence ao Recorte de Contexto, não aqui.
 */
export interface NucleoContexto {
  perfilVersao: number;
  /** Modo Conservador ativo — limita estratégia energética agressiva. */
  modoConservador: boolean;
  idadeAnos?: ValorContexto<number>;
  sexoBiologico?: ValorContexto<string>;
  alturaCm?: ValorContexto<number>;
  pesoKg?: ValorContexto<number>;
  experienciaTreino?: ValorContexto<string>;
  diasDisponiveis?: ValorContexto<string[]>;
  duracaoSessaoMin?: ValorContexto<number>;
  localTreino?: ValorContexto<string>;
  equipamentos?: ValorContexto<string[]>;
  /**
   * Lesões e condições viajam no Núcleo por decisão explícita da ADR
   * 0006: omiti-las de uma prescrição seria falha de produto, não
   * proteção de privacidade.
   */
  lesoes?: ValorContexto<string>;
  condicoes?: ValorContexto<string>;
  restricoesAlimentares?: ValorContexto<string[]>;
}

export function idadeEmAnos(dataNascimento: string, agora: Date): number {
  const nascimento = new Date(dataNascimento);
  let idade = agora.getUTCFullYear() - nascimento.getUTCFullYear();
  const mes = agora.getUTCMonth() - nascimento.getUTCMonth();
  if (mes < 0 || (mes === 0 && agora.getUTCDate() < nascimento.getUTCDate())) {
    idade -= 1;
  }
  return idade;
}

/**
 * Monta o Núcleo a partir do perfil de triagem vigente. Campos não
 * respondidos ficam ausentes em vez de virar valor default — o
 * modelo precisa distinguir "não sei" de "zero" (ADR 0006,
 * invariante 5: sem aproximação silenciosa).
 *
 * Toda a triagem é `medido` (resposta direta do usuário), exceto o
 * que vier marcado como importado pela Importação de Histórico.
 */
export function montarNucleo(entrada: {
  perfilVersao: number;
  respostas: RespostasTriagem;
  respondidoEm: Date;
  agora: Date;
  camposImportados?: readonly (keyof RespostasTriagem)[];
}): NucleoContexto {
  const { respostas, respondidoEm, agora } = entrada;
  const importados = new Set<string>(entrada.camposImportados ?? []);

  const anota = <T>(
    campo: keyof RespostasTriagem,
    valor: T | undefined,
  ): ValorContexto<T> | undefined => {
    if (valor === undefined) return undefined;
    return importados.has(campo)
      ? importado(valor, respondidoEm)
      : medido(valor, respondidoEm);
  };

  return {
    perfilVersao: entrada.perfilVersao,
    modoConservador: avaliarSuficiencia(respostas).modoConservador,
    idadeAnos: anota(
      "dataNascimento",
      respostas.dataNascimento === undefined
        ? undefined
        : idadeEmAnos(respostas.dataNascimento, agora),
    ),
    sexoBiologico: anota("sexoBiologico", respostas.sexoBiologico),
    alturaCm: anota("alturaCm", respostas.alturaCm),
    pesoKg: anota("pesoKg", respostas.pesoKg),
    experienciaTreino: anota("experienciaTreino", respostas.experienciaTreino),
    diasDisponiveis: anota(
      "diasDisponiveis",
      respostas.diasDisponiveis as string[] | undefined,
    ),
    duracaoSessaoMin: anota("duracaoSessaoMin", respostas.duracaoSessaoMin),
    localTreino: anota("localTreino", respostas.localTreino),
    equipamentos: anota(
      "equipamentos",
      respostas.equipamentos === undefined &&
        respostas.equipamentosPersonalizados === undefined
        ? undefined
        : [
            ...(respostas.equipamentos ?? []).map(
              (id) => rotuloEquipamento(id) ?? id,
            ),
            ...(respostas.equipamentosPersonalizados ?? []),
          ],
    ),
    lesoes: anota("lesoes", respostas.lesoes),
    condicoes: anota("condicoes", respostas.condicoes),
    restricoesAlimentares: anota(
      "restricoesAlimentares",
      respostas.restricoesAlimentares,
    ),
  };
}
