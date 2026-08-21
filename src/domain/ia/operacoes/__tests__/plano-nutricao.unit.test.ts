import { describe, expect, it, vi } from "vitest";

const decidir = vi.fn();
vi.mock("../../decidir", () => ({ decidir: (...args: unknown[]) => decidir(...args) }));

const { gerarPlanoNutricaoComIA, planoNutricaoSchema } = await import("../plano-nutricao");

const nucleo = { perfilVersao: 7, modoConservador: false };

const nutricaoValida = {
  nutricao: {
    calorias: 2400,
    proteinaG: 160,
    carboidratosG: 280,
    gordurasG: 70,
    fibrasG: 30,
    estrategia: "Superávit leve",
    refeicoes: [{
      nome: "Café da manhã",
      percentual: 25,
      calorias: 600,
      proteinaG: 40,
      itens: ["Aveia 60 g", "Ovos 2 un"],
      explicacao: {
        porque: "Trinta minutos de preparo comportam uma refeição simples e barata pela manhã.",
        dadosUsados: [{ campo: "tempoPreparoMin", valor: "30" }],
      },
    }],
    explicacoes: {
      calorias: {
        porque: "Estimativa de manutenção para 80 kg, 180 cm e 35 anos, com atividade moderada.",
        dadosUsados: [
          { campo: "pesoKg", valor: "80" },
          { campo: "alturaCm", valor: "180" },
          { campo: "idadeAnos", valor: "35" },
        ],
      },
      proteinaG: {
        porque: "Dois gramas por quilo dos seus 80 kg sustentam o ganho de massa que você escolheu.",
        dadosUsados: [{ campo: "pesoKg", valor: "80" }, { campo: "objetivoComposicao", valor: "ganhar-massa" }],
      },
      carboidratosG: {
        porque: "Carboidrato preenche a energia restante para sustentar quatro sessões semanais.",
        dadosUsados: [{ campo: "diasDisponiveis", valor: "4 dias" }],
      },
      gordurasG: {
        porque: "Gordura no piso saudável de 0,8 g por quilo, preservando função hormonal.",
        dadosUsados: [{ campo: "pesoKg", valor: "80" }],
      },
      estrategia: {
        porque: "Seu objetivo de ganhar massa pede superávit leve, e sem modo conservador dá para progredir.",
        dadosUsados: [
          { campo: "objetivoComposicao", valor: "ganhar-massa" },
          { campo: "modoConservador", valor: "desativado" },
        ],
      },
    },
  },
  dadosUsados: ["triagem-completa", "linha-base-corporal"],
};

describe("gerarPlanoNutricaoComIA", () => {
  it("decide como operação própria e recebe as fotos corporais", async () => {
    decidir.mockResolvedValue({ status: "ok", valor: nutricaoValida, contexto: {}, modeloResolvido: "openai/gpt-5.6-luna", degradado: false });

    await gerarPlanoNutricaoComIA({
      userId: "u1",
      nucleo,
      consentimentos: ["triagem-completa", "fotos-corporais"],
      triagemCompleta: { objetivoComposicao: "ganhar-massa" },
      fotosCorporais: [{ id: "f1", pose: "frente", observadoEm: "2026-08-13", dados: new Uint8Array([9]), mediaType: "image/jpeg" }],
    });

    expect(decidir).toHaveBeenCalledWith(expect.objectContaining({
      operacao: "plano-nutricao",
      imagens: [{ dados: new Uint8Array([9]), mediaType: "image/jpeg" }],
    }));
  });

  it("não envia o catálogo de exercícios", async () => {
    decidir.mockResolvedValue({ status: "ok", valor: nutricaoValida, contexto: {}, modeloResolvido: "openai/gpt-5.6-luna", degradado: false });

    await gerarPlanoNutricaoComIA({ userId: "u1", nucleo, consentimentos: [], triagemCompleta: {} });

    const { instrucao } = decidir.mock.calls[0][0] as { instrucao: string };
    expect(instrucao).not.toContain("supino-barra");
  });

  it("aceita nutrição com explicação em cada meta", () => {
    const analise = planoNutricaoSchema.safeParse(nutricaoValida);
    expect(analise.error?.issues ?? []).toEqual([]);
    expect(analise.success).toBe(true);
  });

  it("rejeita nutrição sem explicação para cada meta", () => {
    const semExplicacoes = {
      ...nutricaoValida,
      nutricao: { ...nutricaoValida.nutricao, explicacoes: undefined },
    };
    expect(planoNutricaoSchema.safeParse(semExplicacoes).success).toBe(false);
  });

  it("rejeita calorias explicadas sem ancorar em peso, altura, idade, sexo ou atividade", () => {
    const semAncora = {
      ...nutricaoValida,
      nutricao: {
        ...nutricaoValida.nutricao,
        explicacoes: {
          ...nutricaoValida.nutricao.explicacoes,
          calorias: {
            porque: "Escolhemos essa energia porque você quer ganhar massa neste ciclo de treino.",
            dadosUsados: [{ campo: "objetivoComposicao", valor: "ganhar-massa" }],
          },
        },
      },
    };
    expect(planoNutricaoSchema.safeParse(semAncora).success).toBe(false);
  });
});
