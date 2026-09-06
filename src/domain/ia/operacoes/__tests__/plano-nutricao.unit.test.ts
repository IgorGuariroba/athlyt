import { describe, expect, it, vi } from "vitest";

const decidir = vi.fn<(entrada: unknown) => Promise<unknown>>();
vi.mock("../../decidir", () => ({ decidir: (entrada: unknown) => decidir(entrada) }));

const { gerarPlanoNutricaoComIA, planoNutricaoSchema } = await import("../plano-nutricao");
const { montarDadosPlano } = await import("../plano-dados");

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
      itens: [
        {
          nome: "Aveia",
          porcaoDescrita: "60 g",
          quantidade: 60,
          unidade: "g",
          calorias: 236,
          proteinaG: 8,
          carboidratosG: 40,
          gordurasG: 5,
          fibrasG: 5,
          confianca: "alta",
        },
        {
          nome: "Ovos",
          porcaoDescrita: "2 unidades",
          quantidade: 100,
          unidade: "g",
          calorias: 146,
          proteinaG: 13,
          carboidratosG: 1,
          gordurasG: 10,
          fibrasG: 0,
          confianca: "alta",
        },
        {
          nome: "Leite",
          porcaoDescrita: "250 ml",
          quantidade: 250,
          unidade: "ml",
          calorias: 153,
          proteinaG: 8,
          carboidratosG: 12,
          gordurasG: 8,
          fibrasG: 0,
          confianca: "alta",
        },
        {
          nome: "Whey protein",
          porcaoDescrita: "16 g",
          quantidade: 16,
          unidade: "g",
          calorias: 65,
          proteinaG: 11,
          carboidratosG: 1,
          gordurasG: 1,
          fibrasG: 0,
          confianca: "media",
        },
      ],
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
      triagemCompleta: { objetivoComposicao: "ganhar-massa" },
      fotosCorporais: [{ id: "f1", pose: "frente", observadoEm: "2026-08-13", dados: new Uint8Array([9]), mediaType: "image/jpeg" }],
    });

    expect(decidir).toHaveBeenCalledWith(expect.objectContaining({
      operacao: "plano-nutricao",
      imagens: [{ dados: new Uint8Array([9]), mediaType: "image/jpeg" }],
    }));
  });

  it("envia o percentual de gordura corporal no contexto nutricional", () => {
    const dados = montarDadosPlano({
      triagemCompleta: {},
      linhaBaseCorporal: {
        gorduras: [{ percentualBasisPoints: 1820, metodo: "bioimpedancia", confianca: "alta", observadoEm: "2026-08-17" }],
      },
    });

    expect(dados["linha-base-corporal"]).toMatchObject({
      gorduras: [{ percentual: 18.2, metodo: "bioimpedancia", confianca: "alta" }],
    });
  });

  it("instrui a considerar a gordura corporal no cálculo", async () => {
    decidir.mockResolvedValue({ status: "ok", valor: nutricaoValida, contexto: {}, modeloResolvido: "openai/gpt-5.6-luna", degradado: false });

    await gerarPlanoNutricaoComIA({ userId: "u1", nucleo, triagemCompleta: {}, linhaBaseCorporal: { gorduras: [{ percentualBasisPoints: 1820 }] } });

    const { instrucao } = decidir.mock.calls[0]![0] as { instrucao: string };
    expect(instrucao).toContain("percentual de gordura");
    expect(instrucao).toContain("massa livre de gordura");
  });

  it("não envia o catálogo de exercícios", async () => {
    decidir.mockResolvedValue({ status: "ok", valor: nutricaoValida, contexto: {}, modeloResolvido: "openai/gpt-5.6-luna", degradado: false });

    await gerarPlanoNutricaoComIA({ userId: "u1", nucleo, triagemCompleta: {} });

    const { instrucao } = decidir.mock.calls[0]![0] as { instrucao: string };
    expect(instrucao).not.toContain("supino-barra");
  });

  it("aceita nutrição com explicação em cada meta", () => {
    const analise = planoNutricaoSchema.safeParse(nutricaoValida);
    expect(analise.error?.issues ?? []).toEqual([]);
    expect(analise.success).toBe(true);
  });

  it("rejeita item novo sem quantidade nutricional estruturada", () => {
    const comString = structuredClone(nutricaoValida);
    comString.nutricao.refeicoes[0]!.itens = ["Aveia 60 g"] as never;

    expect(planoNutricaoSchema.safeParse(comString).success).toBe(false);
  });

  it("rejeita composição fora de 10% da energia ou 15% da proteína", () => {
    const incoerente = structuredClone(nutricaoValida);
    incoerente.nutricao.refeicoes[0]!.itens[0]!.calorias = 100;

    expect(planoNutricaoSchema.safeParse(incoerente).success).toBe(false);
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
