import { describe, expect, it } from "vitest";
import { montarResumoTriagem } from "../resumo";
import type { RespostasTriagem } from "../etapas";

/**
 * Seam: montagem do resumo apresentável (tela 024 — o que foi
 * preenchido, o que falta, o que cada dado destrava) a partir das
 * respostas puras — sem I/O, para ser reutilizado tanto pela página
 * de resumo quanto pelo cartão "completar perfil" do Início.
 */
describe("montarResumoTriagem", () => {
  it("perfil vazio: todas as etapas aparecem como pendentes", () => {
    const resumo = montarResumoTriagem({});
    expect(resumo.itens.every((item) => !item.respondida)).toBe(true);
    expect(resumo.modoConservador).toBe(true);
  });

  it("marca cada item com seu título e o que destrava", () => {
    const resumo = montarResumoTriagem({ dataNascimento: "1994-05-01" });
    const idade = resumo.itens.find((item) => item.id === "idade");
    expect(idade?.respondida).toBe(true);
    expect(idade?.titulo).toBe("Idade");
    expect(idade?.destrava.length).toBeGreaterThan(0);
  });

  it("perfil obrigatório completo: modoConservador é falso", () => {
    const respostas: RespostasTriagem = {
      dataNascimento: "1994-05-01",
      sexoBiologico: "masculino",
      alturaCm: 178,
      pesoKg: 82,
      objetivoConfirmado: true,
      experienciaTreino: "intermediario",
      diasDisponiveis: ["segunda"],
      duracaoSessaoMin: 60,
      localTreino: "casa",
      equipamentos: [],
    };
    const resumo = montarResumoTriagem(respostas);
    expect(resumo.modoConservador).toBe(false);
  });
});
