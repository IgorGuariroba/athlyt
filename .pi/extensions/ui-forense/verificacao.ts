/**
 * Falsificação de achados.
 *
 * O problema que esta camada resolve não é "achar defeito": é impedir
 * que uma percepção visual do agente vire achado sem prova. Toda
 * hipótese passa por um critério com regra numérica declarada e sai
 * confirmada, rejeitada ou indeterminada.
 *
 * `indeterminada` é deliberadamente um resultado de primeira classe.
 * Sem a evidência que o critério exige, adivinhar um veredito
 * reproduziria exatamente o defeito que a ferramenta combate.
 */

import {
  ALVO_DE_TOQUE_MINIMO,
  avaliarAlvoDeToque,
  avaliarFoco,
  avaliarOclusao,
  avaliarOverflow,
  type AmostraDeHitTest,
} from "./checagens";
import { avaliarTokens, type EscalaDeTokens } from "./tokens";
import type { Caixa, EstiloComputado, NoColetado, Viewport } from "./tipos";

export type Criterio =
  | "alvo-de-toque"
  | "overflow"
  | "oclusao"
  | "foco-visivel"
  | "tokens";

export type EntradaDeVerificacao = {
  criterio: Criterio;
  elemento: NoColetado;
  ancestralClicavel?: { caixa: Caixa };
  viewport?: Viewport;
  amostras?: AmostraDeHitTest[];
  foco?: { focavel: boolean; antes: EstiloComputado; depois: EstiloComputado };
  escala?: EscalaDeTokens;
};

export type Veredito = {
  status: "confirmada" | "rejeitada" | "indeterminada";
  criterio: Criterio;
  regra: string;
  motivo: string;
  evidencia: unknown;
};

const REGRAS: Record<Criterio, string> = {
  "alvo-de-toque": `>= ${ALVO_DE_TOQUE_MINIMO}×${ALVO_DE_TOQUE_MINIMO}`,
  overflow: "caixa contida na largura da viewport",
  oclusao: "hit-test do elemento atinge o próprio elemento",
  "foco-visivel": "estilo muda ao receber foco",
  tokens: "estilo computado casa com a escala de globals.css",
};

export function verificarHipotese(entrada: EntradaDeVerificacao): Veredito {
  const base = { criterio: entrada.criterio, regra: REGRAS[entrada.criterio] };

  switch (entrada.criterio) {
    case "alvo-de-toque": {
      const evidencia = avaliarAlvoDeToque(entrada.elemento, entrada.ancestralClicavel);
      const medida = `${evidencia.largura}×${evidencia.altura}`;
      return {
        ...base,
        status: evidencia.conforme ? "rejeitada" : "confirmada",
        evidencia,
        motivo: evidencia.conforme
          ? `Área clicável real é ${medida}, dentro do mínimo${
              evidencia.alvoHerdado ? " (herdada do ancestral clicável)" : ""
            }.`
          : `Área clicável é ${medida}, abaixo do mínimo de ${evidencia.minimo}×${evidencia.minimo}.`,
      };
    }

    case "overflow": {
      if (!entrada.viewport) {
        return {
          ...base,
          status: "indeterminada",
          evidencia: null,
          motivo: "Sem viewport: chame ui_abrir antes de verificar overflow.",
        };
      }
      const evidencia = avaliarOverflow(entrada.elemento, entrada.viewport);
      return {
        ...base,
        status: evidencia.transborda ? "confirmada" : "rejeitada",
        evidencia,
        motivo: evidencia.transborda
          ? `Transborda ${evidencia.excedente}px à ${evidencia.lado}.`
          : "Caixa contida na largura da viewport.",
      };
    }

    case "oclusao": {
      if (!entrada.amostras || entrada.amostras.length === 0) {
        return {
          ...base,
          status: "indeterminada",
          evidencia: null,
          motivo: "Sem amostras de hit-test para este elemento.",
        };
      }
      const evidencia = avaliarOclusao({
        esperado: entrada.elemento.seletor,
        amostras: entrada.amostras,
      });
      return {
        ...base,
        status: evidencia.obstruido ? "confirmada" : "rejeitada",
        evidencia,
        motivo: evidencia.obstruido
          ? `Obstruído por ${evidencia.obstrutores.join(", ")} em ${
              evidencia.pontosAmostrados - evidencia.pontosLivres
            } de ${evidencia.pontosAmostrados} pontos.`
          : `Todos os ${evidencia.pontosAmostrados} pontos atingem o próprio elemento.`,
      };
    }

    case "foco-visivel": {
      if (!entrada.foco) {
        return {
          ...base,
          status: "indeterminada",
          evidencia: null,
          motivo: "Sem estilo antes/depois do foco para este elemento.",
        };
      }
      const evidencia = avaliarFoco(entrada.foco);
      return {
        ...base,
        status: evidencia.focoVisivel ? "rejeitada" : "confirmada",
        evidencia,
        motivo: evidencia.focoVisivel
          ? "Estilo muda ao receber foco."
          : evidencia.focavel
            ? "Elemento recebe foco por teclado sem nenhuma mudança visual."
            : "Elemento não é alcançável por teclado.",
      };
    }

    case "tokens": {
      if (!entrada.escala) {
        return {
          ...base,
          status: "indeterminada",
          evidencia: null,
          motivo: "Escala de tokens não carregada de globals.css.",
        };
      }
      const evidencia = avaliarTokens(entrada.elemento, entrada.escala);
      return {
        ...base,
        status: evidencia.length > 0 ? "confirmada" : "rejeitada",
        evidencia,
        motivo:
          evidencia.length > 0
            ? evidencia
                .map(
                  (violacao) =>
                    `${violacao.propriedade} ${violacao.computado}px fora da escala (mais próximo: ${violacao.tokenMaisProximo} = ${violacao.esperado}px)`,
                )
                .join("; ")
            : "Estilo computado casa com a escala de globals.css.",
      };
    }
  }
}
