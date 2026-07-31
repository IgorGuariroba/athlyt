import { describe, expect, it } from "vitest";
import type { RespostasTriagem } from "@/domain/triagem/etapas";
import { gerarPlano, substituirExercicio } from "../gerador";

const completo: RespostasTriagem = {
  dataNascimento: "1995-01-01", sexoBiologico: "masculino", alturaCm: 180, pesoKg: 80,
  objetivoComposicao: "ganhar-massa", experienciaTreino: "intermediario",
  diasDisponiveis: ["segunda", "terca", "quinta", "sexta"], duracaoSessaoMin: 60,
  localTreino: "academia-completa", equipamentos: ["halteres", "banco-reto", "barra-olimpica", "anilhas", "rack-agachamento", "barra-fixa", "polia-alta", "polia-baixa", "leg-press", "mesa-flexora", "cadeira-extensora"],
  lesoes: "", condicoes: "", restricoesAlimentares: [], orcamentoAlimentar: "medio",
  tempoPreparoMin: 30, nivelAtividade: "moderado", horasSono: 8,
};

describe("gerarPlano — tabela de cenários", () => {
  it.each([
    ["iniciante", 2, 4], ["intermediario", 4, 6], ["avancado", 5, 8],
  ] as const)("experiência %s e %i dias produz bloco de %i semanas", (experiencia, dias, semanas) => {
    const respostas = {
      ...completo,
      experienciaTreino: experiencia,
      diasDisponiveis: (["segunda", "terca", "quarta", "quinta", "sexta"] as const).slice(0, dias),
    };
    const plano = gerarPlano({ perfilVersao: 14, respostas, agora: new Date("2025-06-01") });
    expect(plano.bloco.dias).toHaveLength(dias);
    expect(plano.bloco.duracaoSemanas).toBe(semanas);
    expect(plano.bloco.dias.every((d) => d.exercicios.every((e) => e.series > 0 && e.repeticoes && e.rir >= 0 && e.descansoSeg > 0 && e.justificativa))).toBe(true);
  });

  it("mesma entrada produz exatamente o mesmo plano", () => {
    const entrada = { perfilVersao: 14, respostas: completo, agora: new Date("2025-06-01") };
    expect(gerarPlano(entrada)).toEqual(gerarPlano(entrada));
  });

  it("só usa equipamentos disponíveis", () => {
    const plano = gerarPlano({ perfilVersao: 1, respostas: { ...completo, equipamentos: [] }, agora: new Date("2025-06-01") });
    const ids = plano.bloco.dias.flatMap((d) => d.exercicios.map((e) => e.exercicioId));
    expect(ids).not.toContain("supino-barra");
    expect(ids).toContain("flexao-de-braco");
  });

  it("evita exercício contraindicado pela lesão informada", () => {
    const plano = gerarPlano({ perfilVersao: 1, respostas: { ...completo, lesoes: "dor no joelho" }, agora: new Date("2025-06-01") });
    expect(plano.bloco.dias.flatMap((d) => d.exercicios.map((e) => e.exercicioId))).not.toContain("agachamento-livre");
  });

  it("perfil insuficiente ativa limites conservadores", () => {
    const plano = gerarPlano({ perfilVersao: 1, respostas: { pesoKg: 80, equipamentos: ["barra-olimpica", "anilhas", "rack-agachamento"] }, agora: new Date("2025-06-01") });
    expect(plano.modoConservador).toBe(true);
    expect(plano.bloco.duracaoSemanas).toBe(4);
    expect(plano.bloco.dias).toHaveLength(2);
    expect(plano.bloco.dias.flatMap((d) => d.exercicios).every((e) => e.rir >= 3)).toBe(true);
    expect(plano.nutricao.estrategia).toContain("sem déficit ou superávit agressivo");
  });

  it("cardápio respeita restrição vegetariana e traz quantidades", () => {
    const plano = gerarPlano({ perfilVersao: 1, respostas: { ...completo, restricoesAlimentares: ["Vegetariano"] }, agora: new Date("2025-06-01") });
    const itens = plano.nutricao.refeicoes.flatMap((r) => r.itens).join(" ");
    expect(itens).not.toMatch(/frango|peixe/i);
    expect(itens).toMatch(/tofu|lentilha|feijão/i);
    expect(itens).toMatch(/\d+ (g|ml|un)/);
  });

  it("meta muda de forma moderada com o objetivo", () => {
    const base = gerarPlano({ perfilVersao: 1, respostas: { ...completo, objetivoComposicao: "recomposicao" }, agora: new Date("2025-06-01") });
    const perda = gerarPlano({ perfilVersao: 1, respostas: { ...completo, objetivoComposicao: "perder-gordura" }, agora: new Date("2025-06-01") });
    const ganho = gerarPlano({ perfilVersao: 1, respostas: { ...completo, objetivoComposicao: "ganhar-massa" }, agora: new Date("2025-06-01") });
    expect(perda.nutricao.calorias).toBeLessThan(base.nutricao.calorias);
    expect(ganho.nutricao.calorias).toBeGreaterThan(base.nutricao.calorias);
  });
});

describe("substituirExercicio", () => {
  it("preserva padrão e prescrição", () => {
    const plano = gerarPlano({ perfilVersao: 1, respostas: completo, agora: new Date("2025-06-01") });
    const dia = plano.bloco.dias[0];
    const atual = dia.exercicios.find((e) => e.padrao === "empurrar-horizontal")!;
    const alterado = substituirExercicio(plano, { diaId: dia.id, exercicioId: atual.exercicioId, novoExercicioId: "supino-halteres" }, completo);
    const novo = alterado.bloco.dias[0].exercicios.find((e) => e.exercicioId === "supino-halteres")!;
    expect(novo.padrao).toBe(atual.padrao);
    expect(novo.series).toBe(atual.series);
  });

  it("rejeita estímulo diferente", () => {
    const plano = gerarPlano({ perfilVersao: 1, respostas: completo, agora: new Date("2025-06-01") });
    const dia = plano.bloco.dias[0];
    const atual = dia.exercicios[0];
    expect(() => substituirExercicio(plano, { diaId: dia.id, exercicioId: atual.exercicioId, novoExercicioId: "prancha" }, completo)).toThrow("preserva");
  });
});
