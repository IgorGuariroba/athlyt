import { describe, expect, it } from "vitest";
import { produzirRevisaoCorporal } from "../revisao-corporal";
import { avaliarConfiancaCorporal } from "..";
import type { RespostasTriagem } from "@/domain/triagem/etapas";

const confiancas = {
  composicaoCorporal: "confiavel",
  proporcoes: "confiavel",
  simetriaBilateral: "confiavel",
  treinamento: "confiavel",
  nutricao: "confiavel",
  saudeRecuperacao: "confiavel",
} as const;

// Cobertura corporal completa, sem fotos: composição e proporções confiáveis,
// simetria apenas limitada. Saúde respondida fornece a terceira dimensão.
const panoramaSemFotos = {
  medicoes: [
    { regiao: "cintura", lado: "unico" },
    { regiao: "pescoco", lado: "unico" },
    { regiao: "quadril", lado: "unico" },
    { regiao: "torax", lado: "unico" },
    { regiao: "ombros", lado: "unico" },
    { regiao: "braco", lado: "direito" },
    { regiao: "braco", lado: "esquerdo" },
    { regiao: "coxa", lado: "direito" },
    { regiao: "coxa", lado: "esquerdo" },
    { regiao: "panturrilha", lado: "direito" },
    { regiao: "panturrilha", lado: "esquerdo" },
  ],
  gorduras: [{ percentualBasisPoints: 1800, metodo: "bioimpedancia" }],
  fotos: [],
} as const;

const triagemSemEquipamentosEObjetivo: RespostasTriagem = {
  pesoKg: 80,
  alturaCm: 180,
  experienciaTreino: "intermediario",
  diasDisponiveis: ["segunda", "quinta"],
  duracaoSessaoMin: 60,
  localTreino: "academia-completa",
  lesoes: "",
  condicoes: "",
};

function revisarAtleta(respostas: RespostasTriagem) {
  return produzirRevisaoCorporal({
    dimensoes: { aderencia: 80, desempenho: 70, tendenciaCorporal: 60, recuperacao: 40, utilidade: 80 },
    confiancas: avaliarConfiancaCorporal(panoramaSemFotos, respostas),
    evidencias: [],
    semanasObservadas: 2,
  });
}

describe("Revisão Semanal na fronteira de confiança derivada do atleta", () => {
  it("mantém o plano com três dimensões confiáveis, mesmo com recuperação baixa", () => {
    const revisao = revisarAtleta(triagemSemEquipamentosEObjetivo);

    expect(revisao.confiancas).toEqual({
      composicaoCorporal: "confiavel",
      proporcoes: "confiavel",
      simetriaBilateral: "limitada",
      treinamento: "indisponivel",
      nutricao: "indisponivel",
      saudeRecuperacao: "confiavel",
    });
    expect(revisao.proposta.tipo).toBe("manter");
  });

  it.each([
    { nome: "objetivo respondido", respostas: { objetivoComposicao: "recomposicao" }, treinamento: "indisponivel", nutricao: "confiavel" },
    { nome: "objetivo confirmado sem composição explícita", respostas: { objetivoConfirmado: true }, treinamento: "indisponivel", nutricao: "confiavel" },
    { nome: "equipamentos explicitamente vazios", respostas: { equipamentos: [] }, treinamento: "confiavel", nutricao: "indisponivel" },
    { nome: "disponibilidade explicitamente vazia", respostas: { equipamentos: [], diasDisponiveis: [] }, treinamento: "confiavel", nutricao: "indisponivel" },
  ] satisfies { nome: string; respostas: RespostasTriagem; treinamento: string; nutricao: string }[])("autoriza redução ao atingir quatro dimensões: $nome", ({ respostas, treinamento, nutricao }) => {
    const revisao = revisarAtleta({ ...triagemSemEquipamentosEObjetivo, ...respostas });

    expect(revisao.confiancas).toEqual({
      composicaoCorporal: "confiavel",
      proporcoes: "confiavel",
      simetriaBilateral: "limitada",
      treinamento,
      nutricao,
      saudeRecuperacao: "confiavel",
    });
    expect(revisao.proposta).toMatchObject({
      tipo: "auto_aplicado",
      exigeAprovacao: false,
      ajuste: { tipo: "reduzir-volume", limitePercentual: 10 },
    });
  });

  it.each(["experienciaTreino", "diasDisponiveis", "duracaoSessaoMin", "localTreino", "equipamentos"] as const)(
    "não cruza o limiar com a etapa de treinamento incompleta: %s ausente",
    (campo) => {
      const respostas: RespostasTriagem = {
        ...triagemSemEquipamentosEObjetivo,
        equipamentos: [],
        [campo]: undefined,
      };
      const revisao = revisarAtleta(respostas);

      expect(revisao.confiancas.treinamento).toBe("indisponivel");
      expect(revisao.proposta.tipo).toBe("manter");
    },
  );
});

describe("Revisão Semanal com mudança de objetivo pendente", () => {
  it("propõe mudança estrutural mesmo quando o Scorecard está positivo", () => {
    const revisao = produzirRevisaoCorporal({
      dimensoes: {
        aderencia: 90,
        desempenho: 85,
        tendenciaCorporal: 80,
        recuperacao: 90,
        utilidade: 85,
      },
      confiancas,
      evidencias: [],
      semanasObservadas: 4,
      reavaliacaoPendente: {
        gatilho: "mudanca_objetivo",
        impacto: "estrutural",
        objetivoAnterior: "ganhar-massa",
        objetivoNovo: "recomposicao",
      },
    });

    expect(revisao.proposta).toMatchObject({
      tipo: "estrutural",
      exigeAprovacao: true,
      gatilho: "mudanca_objetivo",
    });
  });
});
