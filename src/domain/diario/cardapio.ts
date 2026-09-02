import type { MetaNutricional } from "@/domain/plano/tipos";
import {
  ehItemPlanejado,
  interpretarItemPlanejadoLegadoNaBase,
  itemPlanejadoParaPrato,
} from "@/domain/plano/item-planejado";
import type { EntradaPlanejada, ItemAlimentar, Macros } from "./tipos";

export const MACROS_ZERO: Macros = {
  calorias: 0,
  proteinaG: 0,
  carboidratosG: 0,
  gordurasG: 0,
  fibrasG: 0,
};

export function somarMacros(lista: Macros[]): Macros {
  return lista.reduce(
    (total, m) => ({
      calorias: total.calorias + m.calorias,
      proteinaG: total.proteinaG + m.proteinaG,
      carboidratosG: total.carboidratosG + m.carboidratosG,
      gordurasG: total.gordurasG + m.gordurasG,
      fibrasG: total.fibrasG + m.fibrasG,
    }),
    { ...MACROS_ZERO },
  );
}

export function escalarMacros(macros: Macros, fator: number): Macros {
  return {
    calorias: Math.round(macros.calorias * fator),
    proteinaG: Math.round(macros.proteinaG * fator),
    carboidratosG: Math.round(macros.carboidratosG * fator),
    gordurasG: Math.round(macros.gordurasG * fator),
    fibrasG: Math.round(macros.fibrasG * fator),
  };
}

export function subtrairMacros(a: Macros, b: Macros): Macros {
  return {
    calorias: a.calorias - b.calorias,
    proteinaG: a.proteinaG - b.proteinaG,
    carboidratosG: a.carboidratosG - b.carboidratosG,
    gordurasG: a.gordurasG - b.gordurasG,
    fibrasG: a.fibrasG - b.fibrasG,
  };
}

export function metaDoDia(nutricao: MetaNutricional): Macros {
  return {
    calorias: nutricao.calorias,
    proteinaG: nutricao.proteinaG,
    carboidratosG: nutricao.carboidratosG,
    gordurasG: nutricao.gordurasG,
    fibrasG: nutricao.fibrasG,
  };
}

/**
 * Horário sugerido de cada refeição. O Cardápio Diário prescreve
 * composição, não relógio; a linha do tempo precisa de uma posição, e
 * uma âncora previsível por nome é mais útil ao atleta do que
 * espalhar refeições em horários arbitrários.
 */
const HORARIOS: Record<string, string> = {
  "café da manhã": "08:00",
  almoço: "12:30",
  lanche: "16:00",
  jantar: "20:00",
  ceia: "22:00",
};

export function horarioSugerido(nome: string, indice: number): string {
  return HORARIOS[nome.trim().toLowerCase()] ?? `${String(7 + indice * 4).padStart(2, "0")}:00`;
}

/**
 * Categorias oferecidas ao nomear um Registro Retroativo. Derivadas
 * das mesmas âncoras acima para que uma refeição sem
 * planejamento caia no mesmo vocabulário das planejadas — e, por
 * consequência, no mesmo horário de referência na linha do tempo.
 *
 * São sugestão, não lista fechada: o atleta pode dar um nome próprio
 * à refeição.
 */
export const CATEGORIAS_DE_REFEICAO: readonly string[] = [
  "Café da manhã",
  "Almoço",
  "Lanche",
  "Jantar",
  "Ceia",
];

/**
 * Materializa o Cardápio Diário como Entradas Planejadas.
 *
 * Planos novos já trazem Item Planejado completo. Planos antigos são
 * interpretados aqui, uma única vez, somente quando **todos** os itens
 * têm alimento e porção inequívocos na base. Se um deles não tiver, a
 * leitura histórica inteira permanece no formato legado: misturar
 * linhas verdadeiras com frações artificiais tornaria o subtotal ainda
 * menos explicável. A edição usa uma Proposta de Edição própria para
 * resolver o restante por IA antes de permitir confirmação.
 */
export function entradasPlanejadas(nutricao: MetaNutricional): EntradaPlanejada[] {
  return nutricao.refeicoes.map((refeicao, indice) => {
    const fracao = refeicao.percentual / 100;
    const macros: Macros = {
      calorias: refeicao.calorias,
      proteinaG: refeicao.proteinaG,
      carboidratosG: Math.round(nutricao.carboidratosG * fracao),
      gordurasG: Math.round(nutricao.gordurasG * fracao),
      fibrasG: Math.round(nutricao.fibrasG * fracao),
    };
    const planejados = refeicao.itens.map((item) =>
      ehItemPlanejado(item)
        ? item
        : typeof item === "string"
          ? interpretarItemPlanejadoLegadoNaBase(item)
          : null,
    );
    const quantidade = Math.max(1, refeicao.itens.length);
    const itens: ItemAlimentar[] = planejados.every((item) => item !== null)
      ? planejados.map(itemPlanejadoParaPrato)
      : refeicao.itens.map((item) => ({
          descricao: typeof item === "string" ? item : `${item.nome} ${item.porcaoDescrita}`,
          ...escalarMacros(macros, 1 / quantidade),
        }));
    return {
      refeicaoRef: `${indice}-${refeicao.nome}`,
      nome: refeicao.nome,
      horaLocal: horarioSugerido(refeicao.nome, indice),
      itens,
      // Somar os itens (em vez de repetir os macros da refeição)
      // mantém cartão e detalhamento consistentes após o
      // arredondamento por item.
      macros: itens.length > 0 ? somarMacros(itens) : macros,
      explicacao: refeicao.explicacao,
    };
  });
}
