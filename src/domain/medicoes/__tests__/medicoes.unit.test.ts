import { describe, expect, it } from "vitest";
import { avaliarConfiancaCorporal, calcularPendenciasCadencia, consolidarCircunferencia, detectarAssimetriaSuspeita, gerarMetasProporcao } from "../index";
import type { RespostasTriagem } from "@/domain/triagem/etapas";

const panoramaCompleto = {
  medicoes: [
    ...(["cintura", "pescoco", "quadril", "torax", "ombros"] as const).map((regiao) => ({ regiao, lado: "unico" as const })),
    ...(["braco", "coxa", "panturrilha"] as const).flatMap((regiao) =>
      (["direito", "esquerdo"] as const).map((lado) => ({ regiao, lado }))),
  ],
  gorduras: [{ percentualBasisPoints: 1800 }],
  fotos: [{ pose: "frente" }],
};
const respostasCompletas: RespostasTriagem = {
  experienciaTreino: "intermediario", diasDisponiveis: ["segunda"], duracaoSessaoMin: 60,
  localTreino: "academia-completa", equipamentos: ["halteres"],
  pesoKg: 80, alturaCm: 180, objetivoComposicao: "recomposicao", lesoes: "", condicoes: "",
};

describe("protocolo de circunferências", () => {
  // `fita-v2`: uma leitura basta. Leituras extras continuam
  // aceitas para quem quiser conferir.
  it("aceita uma única leitura", () => {
    expect(consolidarCircunferencia([82.3])).toMatchObject({ ok: true, valorMm: 823 });
  });

  it("marca leitura única como moderada, nunca alta", () => {
    // Sem repetição não há evidência de reprodutibilidade; declarar
    // "alta" seria confiança fabricada.
    expect(consolidarCircunferencia([82.3])).toMatchObject({ qualidade: "moderada" });
  });

  it("consolida leituras concordantes pela mediana e eleva a qualidade", () => {
    expect(consolidarCircunferencia([82.1, 82.4])).toMatchObject({ ok: true, valorMm: 823, qualidade: "alta" });
  });

  it("aceita divergência moderada entre leituras sem pedir outra", () => {
    expect(consolidarCircunferencia([82, 83.2])).toMatchObject({ ok: true, qualidade: "baixa" });
  });

  it("recusa leituras muito diferentes entre si", () => {
    expect(consolidarCircunferencia([82, 84.5, 88])).toMatchObject({ ok: false });
  });

  it("recusa medida fora da faixa plausível", () => {
    expect(consolidarCircunferencia([5])).toMatchObject({ ok: false });
    expect(consolidarCircunferencia([])).toMatchObject({ ok: false });
  });
});

describe("confiança granular", () => {
  it("não confunde medidas completas com triagem respondida: sem equipamentos e objetivo são três confiáveis", () => {
    const respostas = { ...respostasCompletas };
    delete respostas.equipamentos;
    delete respostas.objetivoComposicao;
    expect(avaliarConfiancaCorporal({ ...panoramaCompleto, fotos: [] }, respostas)).toEqual({
      composicaoCorporal: "confiavel", proporcoes: "confiavel", simetriaBilateral: "limitada",
      treinamento: "indisponivel", nutricao: "indisponivel", saudeRecuperacao: "confiavel",
    });
  });

  it.each(["duracaoSessaoMin", "localTreino"] as const)("exige %s para confiança de treinamento", (campo) => {
    const respostas = { ...respostasCompletas, [campo]: undefined };
    expect(avaliarConfiancaCorporal(panoramaCompleto, respostas).treinamento).toBe("indisponivel");
  });

  it("aceita nenhum dia, nenhum equipamento e nenhuma condição como respostas explícitas", () => {
    expect(avaliarConfiancaCorporal(panoramaCompleto, {
      ...respostasCompletas, diasDisponiveis: [], equipamentos: [], lesoes: "", condicoes: "",
    })).toEqual({
      composicaoCorporal: "confiavel", proporcoes: "confiavel", simetriaBilateral: "confiavel",
      treinamento: "confiavel", nutricao: "confiavel", saudeRecuperacao: "confiavel",
    });
  });

  it("respeita a confirmação de objetivo dos perfis legados", () => {
    const respostas = { ...respostasCompletas, objetivoConfirmado: true };
    delete respostas.objetivoComposicao;
    expect(avaliarConfiancaCorporal(panoramaCompleto, respostas).nutricao).toBe("confiavel");
  });

  it.each([undefined, null, {}])("trata perfil ausente ou vazio sem fabricar respostas (%s)", (respostas) => {
    expect(avaliarConfiancaCorporal(panoramaCompleto, respostas)).toEqual({
      composicaoCorporal: "confiavel", proporcoes: "confiavel", simetriaBilateral: "confiavel",
      treinamento: "indisponivel", nutricao: "indisponivel", saudeRecuperacao: "limitada",
    });
  });

  it("não inventa cobertura bilateral a partir de medidas sem lado", () => {
    expect(avaliarConfiancaCorporal({
      ...panoramaCompleto,
      medicoes: panoramaCompleto.medicoes.map((medicao) => ({ ...medicao, lado: "unico" })),
    }, respostasCompletas).simetriaBilateral).toBe("indisponivel");
  });

  it("não limita nutrição por ausência de fotos", () => {
    const confianca = avaliarConfiancaCorporal({
      medicoes: [
        { regiao: "cintura", lado: "unico" },
        { regiao: "pescoco", lado: "unico" },
        { regiao: "quadril", lado: "unico" },
      ],
      gorduras: [],
      fotos: [],
    }, { pesoKg: 80, alturaCm: 180, objetivoComposicao: "recomposicao" });
    expect(confianca.nutricao).toBe("confiavel");
    expect(confianca.simetriaBilateral).toBe("indisponivel");
  });
});

describe("cadência", () => {
  it("respeita limites diário, semanal e mensal", () => {
    const agora = new Date("2026-08-10T12:00:00Z");
    expect(calcularPendenciasCadencia({ agora, ultimoPeso: new Date("2026-08-10T08:00:00Z"), ultimaCintura: new Date("2026-08-01T12:00:00Z"), ultimaCompleta: new Date("2026-07-01T12:00:00Z"), ultimasFotos: new Date("2026-08-01T12:00:00Z") })).toEqual({ peso: false, cintura: true, completa: true, fotos: false });
  });
});

describe("metas e segurança", () => {
  it("gera meta de ciclo conservadora e versionada", () => {
    const [meta] = gerarMetasProporcao([{ regiao: "ombros", lado: "unico", leiturasMm: [1100, 1102], valorMm: 1102, qualidade: "alta", observadoEm: new Date() }], ["ombros"]);
    expect(meta).toMatchObject({ regiao: "ombros", direcao: "aumentar", metodologiaVersao: "trajetoria-v1" });
    expect(meta!.metaCicloMm).toBeGreaterThan(meta!.atualMm);
  });

  it("transforma assimetria com sintoma em cautela, não prioridade", () => {
    expect(detectarAssimetriaSuspeita({ direitoMm: 400, esquerdoMm: 380, dor: true })).toEqual({ diferencaMm: 20, confirmavel: false, cautela: true });
  });
});
