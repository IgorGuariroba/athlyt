/**
 * Qual treino o cartão "Treino do dia" oferece hoje no Início.
 *
 * Sem isto o cartão fica preso no primeiro dia do bloco e um treino
 * concluído desaparece do histórico visível do usuário: ele volta ao
 * Início e vê exatamente o mesmo convite de antes, como se nada
 * tivesse acontecido.
 *
 * A rotação é posicional, não por dia da semana: o bloco é uma
 * sequência (A → B → C → A…) e o que define o próximo é o último dia
 * efetivamente treinado, não o calendário. Isso mantém a ordem do
 * bloco intacta para quem pula um dia — que é a maioria das semanas
 * reais.
 */

import type { DiaTreino } from "@/domain/plano/tipos";

export interface SessaoParaCartao {
  id: string;
  diaId: string;
  estado: "em_andamento" | "concluida" | "abandonada";
  startedAt: Date;
  endedAt: Date | null;
}

export type EstadoCartaoTreino = "pronto" | "em_andamento";

export interface TreinoDoDia {
  dia: DiaTreino;
  estado: EstadoCartaoTreino;
  /** Sessão a retomar ou a revisar, conforme o estado. */
  sessaoId: string | null;
  /** Sessões concluídas nos últimos 7 dias, para o resumo do cartão. */
  concluidasNaSemana: number;
}

export function escolherTreinoDoDia(
  dias: readonly DiaTreino[],
  sessoes: readonly SessaoParaCartao[],
  agora: Date = new Date(),
): TreinoDoDia | null {
  if (dias.length === 0) return null;

  const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
  const concluidas = sessoes
    .filter((sessao) => sessao.estado === "concluida")
    .sort((a, b) => (a.endedAt ?? a.startedAt).getTime() - (b.endedAt ?? b.startedAt).getTime());
  const concluidasNaSemana = concluidas.filter((sessao) => (sessao.endedAt ?? sessao.startedAt) >= seteDiasAtras).length;

  // Uma sessão em andamento vence qualquer rotação: o usuário está no
  // meio dela e precisa do caminho de volta, não de um treino novo.
  const emAndamento = sessoes.find((sessao) => sessao.estado === "em_andamento");
  if (emAndamento) {
    const dia = dias.find((item) => item.id === emAndamento.diaId) ?? dias[0];
    if (!dia) throw new Error("Plano sem dias de treino.");
    return { dia, estado: "em_andamento", sessaoId: emAndamento.id, concluidasNaSemana };
  }

  const ultima = concluidas.at(-1);
  const indiceUltimo = ultima ? dias.findIndex((item) => item.id === ultima.diaId) : -1;
  const proximo = dias[(indiceUltimo + 1) % dias.length];
  if (!proximo) throw new Error("Plano sem dias de treino.");

  // Concluir uma sessão avança imediatamente a sequência. A data não
  // bloqueia o próximo treino: o atleta pode antecipar, repor ou fazer
  // mais de uma sessão no mesmo dia, sem perder a ordem A → B → C.
  return { dia: proximo, estado: "pronto", sessaoId: null, concluidasNaSemana };
}
