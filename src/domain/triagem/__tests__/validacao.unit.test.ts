import { describe, expect, it } from "vitest";
import { parseRespostaEtapa } from "../validacao";

function formData(entries: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [chave, valor] of Object.entries(entries)) {
    if (Array.isArray(valor)) {
      for (const v of valor) fd.append(chave, v);
    } else {
      fd.append(chave, valor);
    }
  }
  return fd;
}

/**
 * Seam: parsing puro de FormData -> RespostasTriagem por etapa,
 * usado pela server action da cascata (specs/workflow/telas
 * 005-010, 016-023). Sem I/O — cobre a validação de entrada antes de
 * qualquer persistência.
 */
describe("parseRespostaEtapa", () => {
  it("idade: aceita data de nascimento válida", () => {
    const resultado = parseRespostaEtapa(
      "idade",
      formData({ dataNascimento: "1994-05-01" }),
    );
    expect(resultado).toEqual({
      ok: true,
      dados: { dataNascimento: "1994-05-01" },
    });
  });

  it("idade: rejeita data ausente", () => {
    const resultado = parseRespostaEtapa("idade", formData({}));
    expect(resultado.ok).toBe(false);
  });

  it("idade: rejeita data futura", () => {
    const anoQueVem = new Date().getFullYear() + 1;
    const resultado = parseRespostaEtapa(
      "idade",
      formData({ dataNascimento: `${anoQueVem}-01-01` }),
    );
    expect(resultado.ok).toBe(false);
  });

  it("sexo: aceita masculino ou feminino", () => {
    expect(
      parseRespostaEtapa("sexo", formData({ sexoBiologico: "feminino" })),
    ).toEqual({ ok: true, dados: { sexoBiologico: "feminino" } });
  });

  it("sexo: rejeita valor fora do domínio", () => {
    const resultado = parseRespostaEtapa(
      "sexo",
      formData({ sexoBiologico: "outro" }),
    );
    expect(resultado.ok).toBe(false);
  });

  it("altura: aceita número positivo dentro da faixa plausível", () => {
    expect(
      parseRespostaEtapa("altura", formData({ alturaCm: "178" })),
    ).toEqual({ ok: true, dados: { alturaCm: 178 } });
  });

  it("altura: rejeita valor não numérico", () => {
    expect(
      parseRespostaEtapa("altura", formData({ alturaCm: "abc" })).ok,
    ).toBe(false);
  });

  it("altura: rejeita valor fora da faixa plausível", () => {
    expect(
      parseRespostaEtapa("altura", formData({ alturaCm: "999" })).ok,
    ).toBe(false);
  });

  it("peso: aceita número positivo dentro da faixa plausível", () => {
    expect(parseRespostaEtapa("peso", formData({ pesoKg: "82.5" }))).toEqual({
      ok: true,
      dados: { pesoKg: 82.5 },
    });
  });

  it("objetivo: aceita recomposição corporal", () => {
    expect(
      parseRespostaEtapa("objetivo", formData({ objetivoComposicao: "recomposicao" })),
    ).toEqual({ ok: true, dados: { objetivoComposicao: "recomposicao" } });
  });

  it("objetivo: aceita perda de gordura e ganho de massa", () => {
    expect(
      parseRespostaEtapa("objetivo", formData({ objetivoComposicao: "perder-gordura" })),
    ).toEqual({ ok: true, dados: { objetivoComposicao: "perder-gordura" } });
    expect(
      parseRespostaEtapa("objetivo", formData({ objetivoComposicao: "ganhar-massa" })),
    ).toEqual({ ok: true, dados: { objetivoComposicao: "ganhar-massa" } });
  });

  it("objetivo: rejeita quando não selecionado", () => {
    expect(parseRespostaEtapa("objetivo", formData({})).ok).toBe(false);
  });

  it("experiencia: aceita uma das faixas válidas", () => {
    expect(
      parseRespostaEtapa(
        "experiencia",
        formData({ experienciaTreino: "avancado" }),
      ),
    ).toEqual({ ok: true, dados: { experienciaTreino: "avancado" } });
  });

  it("disponibilidade: aceita lista de dias e ordena pela semana", () => {
    const resultado = parseRespostaEtapa(
      "disponibilidade",
      formData({ diasDisponiveis: ["sexta", "segunda", "quarta"] }),
    );
    expect(resultado).toEqual({
      ok: true,
      dados: { diasDisponiveis: ["segunda", "quarta", "sexta"] },
    });
  });

  it("disponibilidade: rejeita lista vazia", () => {
    expect(
      parseRespostaEtapa("disponibilidade", formData({})).ok,
    ).toBe(false);
  });

  it("duracao-sessao: aceita minutos positivos", () => {
    expect(
      parseRespostaEtapa(
        "duracao-sessao",
        formData({ duracaoSessaoMin: "60" }),
      ),
    ).toEqual({ ok: true, dados: { duracaoSessaoMin: 60 } });
  });

  it("academia-equipamentos: aceita local e lista de equipamentos (pode ser vazia)", () => {
    expect(
      parseRespostaEtapa(
        "academia-equipamentos",
        formData({ localTreino: "casa", equipamentos: ["halteres"] }),
      ),
    ).toEqual({
      ok: true,
      dados: { localTreino: "casa", equipamentos: ["halteres"] },
    });
  });

  it("academia-equipamentos: descarta id fora do catálogo em vez de recusar a etapa", () => {
    expect(
      parseRespostaEtapa(
        "academia-equipamentos",
        formData({
          localTreino: "academia-completa",
          equipamentos: ["halteres", "maquina-inexistente", "leg-press"],
        }),
      ),
    ).toEqual({
      ok: true,
      dados: {
        localTreino: "academia-completa",
        equipamentos: ["halteres", "leg-press"],
      },
    });
  });

  it("academia-equipamentos: aceita o local sem equipamentos", () => {
    expect(
      parseRespostaEtapa(
        "academia-equipamentos",
        formData({ localTreino: "sem-equipamentos" }),
      ),
    ).toEqual({
      ok: true,
      dados: { localTreino: "sem-equipamentos", equipamentos: [] },
    });
  });

  it("academia-equipamentos: aceita nenhum equipamento selecionado como lista vazia", () => {
    expect(
      parseRespostaEtapa(
        "academia-equipamentos",
        formData({ localTreino: "academia-completa" }),
      ),
    ).toEqual({
      ok: true,
      dados: { localTreino: "academia-completa", equipamentos: [] },
    });
  });

  it("saude-lesoes: aceita texto vazio como 'sem lesões'", () => {
    expect(
      parseRespostaEtapa("saude-lesoes", formData({ lesoes: "" })),
    ).toEqual({ ok: true, dados: { lesoes: "" } });
  });

  it("saude-condicoes: aceita texto livre", () => {
    expect(
      parseRespostaEtapa(
        "saude-condicoes",
        formData({ condicoes: "hipertensão controlada" }),
      ),
    ).toEqual({ ok: true, dados: { condicoes: "hipertensão controlada" } });
  });

  it("alimentacao-restricoes: aceita lista vazia (sem restrições)", () => {
    expect(
      parseRespostaEtapa("alimentacao-restricoes", formData({})),
    ).toEqual({ ok: true, dados: { restricoesAlimentares: [] } });
  });

  it("alimentacao-logistica: aceita orçamento e tempo de preparo", () => {
    expect(
      parseRespostaEtapa(
        "alimentacao-logistica",
        formData({ orcamentoAlimentar: "medio", tempoPreparoMin: "30" }),
      ),
    ).toEqual({
      ok: true,
      dados: { orcamentoAlimentar: "medio", tempoPreparoMin: 30 },
    });
  });

  it("rotina-sono: aceita nível de atividade e horas de sono", () => {
    expect(
      parseRespostaEtapa(
        "rotina-sono",
        formData({ nivelAtividade: "moderado", horasSono: "7" }),
      ),
    ).toEqual({ ok: true, dados: { nivelAtividade: "moderado", horasSono: 7 } });
  });

  it("rotina-sono: rejeita horas de sono fora da faixa plausível", () => {
    expect(
      parseRespostaEtapa(
        "rotina-sono",
        formData({ nivelAtividade: "moderado", horasSono: "30" }),
      ).ok,
    ).toBe(false);
  });
});
