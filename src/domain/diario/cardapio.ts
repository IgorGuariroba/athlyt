import type { MetaNutricional } from "@/domain/plano/tipos";
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
 * O gerador prescreve macros por refeição e itens como texto; os
 * macros de cada item são a fração igual da refeição. É aproximação
 * declarada, e é o que permite que remover um item na edição reduza
 * o consumo de forma coerente em vez de tudo-ou-nada — a base de
 * alimentos com macros por item chega nos Atalhos de Registro.
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
    const quantidade = Math.max(1, refeicao.itens.length);
    const itens: ItemAlimentar[] = refeicao.itens.map((descricao) => ({
      descricao,
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
