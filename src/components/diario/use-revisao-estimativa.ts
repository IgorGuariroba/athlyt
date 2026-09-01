"use client";

import { useState } from "react";
import { nomeDoItem, reestimarMacros, type ItemPrato } from "@/domain/alimentos/prato";

/**
 * Estado da revisão de uma estimativa, antes de ela virar Consumo Real.
 *
 * Existe porque foto, texto e áudio revisam a mesma coisa da mesma
 * forma: a estimativa nasce diferente nos três, mas o que o atleta faz
 * com ela — corrigir a porção, corrigir o alimento, remover o que não
 * comeu, recalcular a linha que mudou de comida — é idêntico. Cada
 * tela mantinha sua própria cópia dessa lógica, e a da foto tinha
 * menos: nome não editável, sem aviso de defasagem, sem recálculo.
 *
 * Duas invariantes moram aqui, e são a razão de o hook existir em vez
 * de dois `useState` soltos na tela:
 *
 * 1. `nomesEstimados` acompanha `itens` **por posição**. Remover ou
 *    acrescentar item sem realinhar faz o aviso passar a apontar para
 *    o vizinho — e o atleta lê "estes números são de X" sobre a linha
 *    errada.
 * 2. Recalcular resolve a defasagem **de uma linha só**. O aviso das
 *    outras é verdade e precisa continuar na tela.
 */
export interface EstadoDaRevisao {
  itens: ItemPrato[];
  nomesEstimados: string[];
  /** Substitui a lista realinhando os nomes estimados. */
  aoMudarItens: (novos: ItemPrato[]) => void;
  /** Recomeça a revisão a partir de uma estimativa nova. */
  reiniciar: (itens: ItemPrato[]) => void;
  recalcular: (indice: number) => Promise<void>;
}

/** Resposta do recálculo de um item; a forma que as actions devolvem. */
export type ResultadoRecalculo =
  | {
      ok: true;
      macros: {
        calorias: number;
        proteinaG: number;
        carboidratosG: number;
        gordurasG: number;
        fibrasG: number;
        confianca: "alta" | "media" | "baixa";
        modelo: string;
      };
    }
  | { ok: false; erro: string };

export function useRevisaoEstimativa({
  itensIniciais = [],
  recalcularItem,
  aoErrar,
}: {
  itensIniciais?: ItemPrato[];
  /**
   * Recalcula um item pelo nome corrigido. Ausente, a revisão apenas
   * avisa da defasagem — o aviso é verdade mesmo onde não há IA
   * disponível para resolvê-la.
   */
  recalcularItem?: (fd: FormData) => Promise<ResultadoRecalculo>;
  /**
   * Reporta a falha do recálculo à tela, que é dona do aviso. O hook
   * não guarda erro próprio de propósito: a tela já tem um, e dois
   * estados de erro rendem dois avisos que discordam entre si.
   */
  aoErrar?: (mensagem: string | null) => void;
} = {}): EstadoDaRevisao {
  const [itens, setItens] = useState<ItemPrato[]>(itensIniciais);
  const [nomesEstimados, setNomesEstimados] = useState<string[]>(itensIniciais.map(nomeDoItem));
  const setErro = (mensagem: string | null) => aoErrar?.(mensagem);

  /**
   * Item acrescentado à mão entra com o próprio nome: ele nunca está
   * defasado, porque quem informou os macros foi o atleta.
   */
  function aoMudarItens(novos: ItemPrato[]) {
    if (novos.length !== itens.length) {
      const anteriores = new Map(itens.map((item, indice) => [item, nomesEstimados[indice]]));
      setNomesEstimados(novos.map((item) => anteriores.get(item) ?? nomeDoItem(item)));
    }
    setItens(novos);
  }

  function reiniciar(novos: ItemPrato[]) {
    setItens(novos);
    setNomesEstimados(novos.map(nomeDoItem));
    setErro(null);
  }

  async function recalcular(indice: number) {
    if (!recalcularItem) return;
    const item = itens[indice];
    if (!item) return;
    setErro(null);

    const corpo = new FormData();
    corpo.set("alimento", nomeDoItem(item));
    // A quantidade vai com a unidade em que foi estimada: pedir macros
    // de "250" sem dizer se são gramas ou mililitros devolve o número
    // de outra comida.
    corpo.set("quantidade", String(item.quantidade));
    corpo.set("unidade", item.unidade);
    try {
      const resultado = await recalcularItem(corpo);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      // Os números passam a valer para o nome atual, então o aviso desta
      // linha some — e só o desta.
      setItens((atuais) =>
        atuais.map((alvo, i) => (i === indice ? reestimarMacros(alvo, resultado.macros) : alvo)),
      );
      setNomesEstimados((atuais) =>
        atuais.map((alvo, i) => (i === indice ? nomeDoItem(item) : alvo)),
      );
    } catch {
      setErro("Falha de conexão ao recalcular. Os números continuam como estavam.");
    }
  }

  return { itens, nomesEstimados, aoMudarItens, reiniciar, recalcular };
}
