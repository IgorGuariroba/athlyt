import { describe, expect, it } from "vitest";
import type { DiaTreino } from "@/domain/plano/tipos";
import { escolherTreinoDoDia, type SessaoParaCartao } from "../treino-do-dia";

const dias: DiaTreino[] = [
  { id: "dia-1", nome: "Superior A", diaSemana: "segunda", exercicios: [] },
  { id: "dia-2", nome: "Inferior A", diaSemana: "quarta", exercicios: [] },
  { id: "dia-3", nome: "Superior B", diaSemana: "sexta", exercicios: [] },
];

const agora = new Date("2026-08-01T18:00:00Z");
const ontem = new Date("2026-07-31T18:00:00Z");

function sessao(parcial: Partial<SessaoParaCartao>): SessaoParaCartao {
  return { id: "s1", diaId: "dia-1", estado: "concluida", startedAt: ontem, endedAt: ontem, ...parcial };
}

describe("escolherTreinoDoDia", () => {
  it("sem histórico, oferece o primeiro dia do bloco", () => {
    expect(escolherTreinoDoDia(dias, [], agora)).toEqual(
      expect.objectContaining({ dia: dias[0], estado: "pronto", sessaoId: null, concluidasNaSemana: 0 }),
    );
  });

  it("após concluir o Superior A, o Início passa a oferecer o próximo dia do bloco", () => {
    const resultado = escolherTreinoDoDia(dias, [sessao({ diaId: "dia-1" })], agora);
    expect(resultado).toEqual(expect.objectContaining({ dia: dias[1], estado: "pronto", concluidasNaSemana: 1 }));
  });

  it("volta ao início do bloco depois do último dia", () => {
    const resultado = escolherTreinoDoDia(dias, [sessao({ diaId: "dia-3" })], agora);
    expect(resultado?.dia).toEqual(dias[0]);
  });

  it("libera o próximo treino do bloco mesmo quando o anterior foi concluído hoje", () => {
    const hoje = new Date("2026-08-01T09:00:00Z");
    const resultado = escolherTreinoDoDia(dias, [sessao({ id: "s9", diaId: "dia-2", startedAt: hoje, endedAt: hoje })], agora);
    expect(resultado).toEqual(expect.objectContaining({ dia: dias[2], estado: "pronto", sessaoId: null }));
  });

  it("sessão em andamento vence a rotação e devolve o caminho de volta", () => {
    const resultado = escolherTreinoDoDia(dias, [
      sessao({ diaId: "dia-1" }),
      sessao({ id: "s5", diaId: "dia-2", estado: "em_andamento", endedAt: null, startedAt: agora }),
    ], agora);
    expect(resultado).toEqual(expect.objectContaining({ dia: dias[1], estado: "em_andamento", sessaoId: "s5" }));
  });

  it("sessão abandonada não avança a rotação nem conta na semana", () => {
    const resultado = escolherTreinoDoDia(dias, [sessao({ estado: "abandonada", diaId: "dia-1" })], agora);
    expect(resultado).toEqual(expect.objectContaining({ dia: dias[0], estado: "pronto", concluidasNaSemana: 0 }));
  });

  it("conta apenas as conclusões dos últimos sete dias", () => {
    const antiga = new Date("2026-07-01T18:00:00Z");
    const resultado = escolherTreinoDoDia(dias, [
      sessao({ id: "velha", diaId: "dia-1", startedAt: antiga, endedAt: antiga }),
      sessao({ id: "nova", diaId: "dia-2" }),
    ], agora);
    expect(resultado?.concluidasNaSemana).toBe(1);
  });

  it("plano sem dias não produz cartão", () => {
    expect(escolherTreinoDoDia([], [], agora)).toBeNull();
  });
});
