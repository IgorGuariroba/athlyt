/**
 * Numeração dos elementos observados.
 *
 * O agente não deve manipular coordenadas nem inventar seletores: ele
 * recebe `e1..eN` e devolve o mesmo identificador nas ferramentas
 * seguintes. A ordem é a de leitura da tela (topo→base, esquerda→
 * direita), e não a da travessia do DOM, porque é a ordem em que o
 * agente enxerga a captura — `e4` deve ser o quarto elemento da tela,
 * não o quarto nó que o coletor encontrou.
 */

import type { ElementoInventariado, NoColetado } from "./tipos";

/**
 * Tolerância vertical: dois elementos na mesma faixa de ~8px contam
 * como a mesma linha e desempatam pela horizontal. Sem isso, um ícone
 * 2px mais alto que o texto ao lado inverteria a leitura.
 */
const TOLERANCIA_LINHA = 8;

export function numerarInventario(nos: NoColetado[]): ElementoInventariado[] {
  const ordenados = [...nos].sort((a, b) => {
    const mesmaLinha = Math.abs(a.caixa.y - b.caixa.y) <= TOLERANCIA_LINHA;
    if (!mesmaLinha) return a.caixa.y - b.caixa.y;
    return a.caixa.x - b.caixa.x;
  });

  return ordenados.map((no, indice) => ({ ...no, id: `e${indice + 1}` }));
}
