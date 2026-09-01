import { describe, expect, it } from "vitest";
import {
  avaliarSuficiencia,
  etapaRespondida,
  proximaEtapaPendente,
} from "../suficiencia";
import type { RespostasTriagem } from "../etapas";

/**
 * Seam: as funções puras de suficiência/cascata do domínio de
 * Triagem. Um perfil insuficiente ativa o Modo Conservador; completar
 * os dados habilita capacidades.
 */
describe("etapaRespondida", () => {
  it("considera respondida quando todos os campos da etapa existem", () => {
    const respostas: RespostasTriagem = { dataNascimento: "1994-05-01" };
    expect(etapaRespondida("idade", respostas)).toBe(true);
  });

  it("considera não respondida quando falta algum campo da etapa", () => {
    const respostas: RespostasTriagem = { localTreino: "casa" };
    expect(etapaRespondida("academia-equipamentos", respostas)).toBe(false);
  });

  it("aceita valores vazios explícitos (ex.: sem lesões) como resposta dada", () => {
    const respostas: RespostasTriagem = { lesoes: "" };
    expect(etapaRespondida("saude-lesoes", respostas)).toBe(true);
  });

  it("não confunde undefined com resposta vazia", () => {
    const respostas: RespostasTriagem = {};
    expect(etapaRespondida("saude-lesoes", respostas)).toBe(false);
  });
});

describe("avaliarSuficiencia", () => {
  it("perfil vazio está em Modo Conservador e falta todas as etapas obrigatórias", () => {
    const resultado = avaliarSuficiencia({});
    expect(resultado.modoConservador).toBe(true);
    expect(resultado.etapasObrigatoriasFaltantes.length).toBeGreaterThan(0);
    expect(resultado.completo).toBe(false);
  });

  const perfilObrigatorioCompleto: RespostasTriagem = {
    dataNascimento: "1994-05-01",
    sexoBiologico: "masculino",
    alturaCm: 178,
    pesoKg: 82,
    objetivoConfirmado: true,
    experienciaTreino: "intermediario",
    diasDisponiveis: ["segunda", "quarta", "sexta"],
    duracaoSessaoMin: 60,
    localTreino: "academia-completa",
    equipamentos: ["barra", "halteres"],
  };

  it("sai do Modo Conservador quando todas as etapas obrigatórias estão completas", () => {
    const resultado = avaliarSuficiencia(perfilObrigatorioCompleto);
    expect(resultado.modoConservador).toBe(false);
    expect(resultado.etapasObrigatoriasFaltantes).toHaveLength(0);
  });

  it("permanece em Modo Conservador se faltar uma única etapa obrigatória", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructuring só para remover a chave `pesoKg`
    const { pesoKg: _pesoKg, ...semPeso } = perfilObrigatorioCompleto;
    const resultado = avaliarSuficiencia(semPeso);
    expect(resultado.modoConservador).toBe(true);
    expect(resultado.etapasObrigatoriasFaltantes).toContain("peso");
  });

  it("etapas complementares não impedem sair do Modo Conservador", () => {
    const resultado = avaliarSuficiencia(perfilObrigatorioCompleto);
    expect(resultado.etapasComplementaresFaltantes.length).toBeGreaterThan(0);
    expect(resultado.modoConservador).toBe(false);
  });

  it("perfil totalmente completo não tem nenhuma etapa faltante e completo=true", () => {
    const completo: RespostasTriagem = {
      ...perfilObrigatorioCompleto,
      lesoes: "",
      condicoes: "",
      restricoesAlimentares: [],
      orcamentoAlimentar: "medio",
      tempoPreparoMin: 30,
      nivelAtividade: "moderado",
      horasSono: 7,
    };
    const resultado = avaliarSuficiencia(completo);
    expect(resultado.etapasObrigatoriasFaltantes).toHaveLength(0);
    expect(resultado.etapasComplementaresFaltantes).toHaveLength(0);
    expect(resultado.completo).toBe(true);
  });
});

describe("proximaEtapaPendente", () => {
  it("retorna a primeira etapa da cascata quando nada foi respondido", () => {
    expect(proximaEtapaPendente({})).toBe("idade");
  });

  it("retorna a próxima etapa não respondida, respeitando a ordem", () => {
    const respostas: RespostasTriagem = {
      dataNascimento: "1994-05-01",
      sexoBiologico: "masculino",
    };
    expect(proximaEtapaPendente(respostas)).toBe("altura");
  });

  it("retorna null quando todas as etapas foram respondidas", () => {
    const todasRespondidas: RespostasTriagem = {
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
      lesoes: "",
      condicoes: "",
      restricoesAlimentares: [],
      orcamentoAlimentar: "medio",
      tempoPreparoMin: 20,
      nivelAtividade: "leve",
      horasSono: 8,
    };
    expect(proximaEtapaPendente(todasRespondidas)).toBeNull();
  });
});
