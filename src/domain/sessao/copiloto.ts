import {
  orientarProximaSerie,
  type Orientacao,
} from "@/domain/ia/operacoes/copiloto-sessao";
import { obterSessao } from "./repositorio";

export interface GatilhoCopiloto {
  exercicioId: string;
  serieRegistrada: number;
  origem: {
    tela: string;
    rota: string;
    gatilho: string;
  };
}

export type ResultadoCopiloto =
  | { status: "ok"; orientacao: Orientacao; versao: string; proximaSerie: number }
  | { status: "indisponivel"; motivo: string }
  | { status: "obsoleta"; motivo: string };

/**
 * Fronteira da Sessão de Treino com o Copiloto online.
 *
 * A leitura acontece depois de o evento da série ser confirmado pelo servidor:
 * assim o Contexto do Atleta nunca depende de dados enviados pelo navegador sem
 * validação. A série seguinte é também o token de atualidade da resposta.
 */
export async function solicitarOrientacaoProximaSerie(
  userId: string,
  sessionId: string,
  gatilho: GatilhoCopiloto,
): Promise<ResultadoCopiloto> {
  const sessao = await obterSessao(userId, sessionId);
  if (!sessao) {
    return { status: "indisponivel", motivo: "Sessão ou perfil não encontrado." };
  }

  const exercicio = sessao.exercicios.find((item) => item.exercicioId === gatilho.exercicioId);
  const registrada = exercicio?.series.find((serie) => serie.numero === gatilho.serieRegistrada);
  const proxima = exercicio?.series.find((serie) => !serie.concluida);
  if (!exercicio || !registrada?.concluida || proxima?.numero !== gatilho.serieRegistrada + 1) {
    return { status: "obsoleta", motivo: "A próxima série já não corresponde a esta orientação." };
  }

  const resultado = await orientarProximaSerie({
    userId,
    exercicio: {
      nome: exercicio.nome,
      seriesHoje: exercicio.series
        .filter((serie) => serie.concluida)
        .map((serie) => ({
          cargaKg: serie.cargaKg ?? 0,
          repeticoes: serie.repeticoes ?? 0,
          rir: serie.rir,
        })),
      serieAtual: proxima.numero,
      totalSeries: exercicio.series.length,
    },
    origem: gatilho.origem,
  });

  if (resultado.status === "indisponivel") return resultado;
  return {
    status: "ok",
    orientacao: resultado.valor,
    versao: resultado.modeloResolvido,
    proximaSerie: proxima.numero,
  };
}
