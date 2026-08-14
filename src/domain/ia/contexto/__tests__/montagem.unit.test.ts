import { describe, expect, it } from "vitest";
import {
  montarContexto,
  renderizarContexto,
  textoConsentimento,
} from "../montagem";
import { montarNucleo } from "../nucleo";
import { obterRecorte } from "../recortes";
import type { RespostasTriagem } from "@/domain/triagem/etapas";

const AGORA = new Date("2026-07-30T12:00:00Z");
const RESPONDIDO = new Date("2026-07-01T12:00:00Z");

const TRIAGEM_COMPLETA: RespostasTriagem = {
  dataNascimento: "1995-03-10",
  sexoBiologico: "masculino",
  alturaCm: 178,
  pesoKg: 82,
  objetivoComposicao: "recomposicao",
  objetivoConfirmado: true,
  experienciaTreino: "intermediario",
  diasDisponiveis: ["segunda", "quarta", "sexta"],
  duracaoSessaoMin: 60,
  localTreino: "academia-completa",
  equipamentos: ["Halteres", "Barra e anilhas"],
  lesoes: "Desconforto no ombro direito",
  condicoes: "",
  restricoesAlimentares: [],
  orcamentoAlimentar: "medio",
  tempoPreparoMin: 30,
  nivelAtividade: "moderado",
  horasSono: 7,
};

function nucleoCompleto() {
  return montarNucleo({
    perfilVersao: 3,
    respostas: TRIAGEM_COMPLETA,
    respondidoEm: RESPONDIDO,
    agora: AGORA,
  });
}

describe("montarNucleo", () => {
  it("calcula idade e marca proveniência das respostas de triagem", () => {
    const nucleo = nucleoCompleto();
    expect(nucleo.idadeAnos?.valor).toBe(31);
    expect(nucleo.idadeAnos?.proveniencia).toBe("medido");
    expect(nucleo.modoConservador).toBe(false);
    expect(nucleo.objetivoComposicao?.valor).toBe("recomposicao");
  });

  it("omite campos não respondidos em vez de usar default", () => {
    const nucleo = montarNucleo({
      perfilVersao: 1,
      respostas: { pesoKg: 80 },
      respondidoEm: RESPONDIDO,
      agora: AGORA,
    });
    expect(nucleo.pesoKg?.valor).toBe(80);
    expect(nucleo.alturaCm).toBeUndefined();
    expect(nucleo.lesoes).toBeUndefined();
  });

  it("ativa Modo Conservador quando falta etapa obrigatória", () => {
    const nucleo = montarNucleo({
      perfilVersao: 1,
      respostas: { pesoKg: 80 },
      respondidoEm: RESPONDIDO,
      agora: AGORA,
    });
    expect(nucleo.modoConservador).toBe(true);
  });

  it("envia ao modelo rótulos canônicos e nomes personalizados juntos", () => {
    const nucleo = montarNucleo({
      perfilVersao: 1,
      respostas: {
        equipamentos: ["halteres", "leg-press"],
        equipamentosPersonalizados: ["Belt squat pendular"],
      },
      respondidoEm: RESPONDIDO,
      agora: AGORA,
    });

    expect(nucleo.equipamentos?.valor).toEqual([
      "Halteres",
      "Leg press",
      "Belt squat pendular",
    ]);
  });

  it("marca como importado os campos vindos da Importação de Histórico", () => {
    const nucleo = montarNucleo({
      perfilVersao: 2,
      respostas: TRIAGEM_COMPLETA,
      respondidoEm: RESPONDIDO,
      agora: AGORA,
      camposImportados: ["experienciaTreino"],
    });
    expect(nucleo.experienciaTreino?.proveniencia).toBe("importado");
    expect(nucleo.pesoKg?.proveniencia).toBe("medido");
  });
});

describe("montarContexto", () => {
  it("envia campo sensível quando há consentimento vigente", () => {
    const contexto = montarContexto({
      operacao: "copiloto-sessao",
      nucleo: nucleoCompleto(),
      dados: {
        exercicio: { nome: "Supino" },
        "prontidao-hoje": { energia: 2, dores: "ombro direito" },
      },
      consentimentos: ["prontidao-hoje"],
    });

    expect(contexto.recorte["prontidao-hoje"]).toBeDefined();
    expect(contexto.degradado).toBe(false);
  });

  it("omite campo sensível sem consentimento e marca degradação", () => {
    const contexto = montarContexto({
      operacao: "copiloto-sessao",
      nucleo: nucleoCompleto(),
      dados: {
        exercicio: { nome: "Supino" },
        "prontidao-hoje": { energia: 2, dores: "ombro direito" },
      },
      consentimentos: [],
    });

    expect(contexto.recorte["prontidao-hoje"]).toBeUndefined();
    expect(contexto.camposOmitidos).toEqual(["prontidao-hoje"]);
    expect(contexto.degradado).toBe(true);
  });

  it("descarta campo não declarado pelo recorte mesmo se fornecido", () => {
    const contexto = montarContexto({
      operacao: "copiloto-sessao",
      nucleo: nucleoCompleto(),
      dados: {
        exercicio: { nome: "Supino" },
        "dado-nao-declarado": "vazamento",
      },
      consentimentos: [],
    });

    expect(contexto.recorte["dado-nao-declarado"]).toBeUndefined();
  });

  it("registra a versão do recorte usada", () => {
    const contexto = montarContexto({
      operacao: "revisao-semanal",
      nucleo: nucleoCompleto(),
      dados: {},
      consentimentos: [],
    });
    expect(contexto.recorteVersao).toBe(obterRecorte("revisao-semanal").versao);
  });
});

describe("renderizarContexto", () => {
  it("mostra proveniência e data junto de cada valor", () => {
    const texto = renderizarContexto(
      montarContexto({
        operacao: "copiloto-sessao",
        nucleo: nucleoCompleto(),
        dados: {},
        consentimentos: [],
      }),
    );

    expect(texto).toContain("pesoKg: 82 [medido, 2026-07-01]");
    expect(texto).toContain(
      "experienciaTreino: intermediário (entre 1 e 3 anos de treino consistente) [medido, 2026-07-01]",
    );
    expect(texto).toContain("Desconforto no ombro direito");
  });

  it("anuncia Modo Conservador no topo quando ativo", () => {
    const texto = renderizarContexto(
      montarContexto({
        operacao: "copiloto-sessao",
        nucleo: montarNucleo({
          perfilVersao: 1,
          respostas: { pesoKg: 80 },
          respondidoEm: RESPONDIDO,
          agora: AGORA,
        }),
        dados: {},
        consentimentos: [],
      }),
    );

    expect(texto).toContain("MODO CONSERVADOR ATIVO");
  });

  it("declara o que faltou em vez de deixar o modelo presumir", () => {
    const texto = renderizarContexto(
      montarContexto({
        operacao: "copiloto-sessao",
        nucleo: nucleoCompleto(),
        dados: { "prontidao-hoje": { energia: 1 } },
        consentimentos: [],
      }),
    );

    expect(texto).toContain("Informação indisponível");
    expect(texto).toContain("prontidao-hoje");
    expect(texto).toContain("não presuma valores");
  });
});

describe("textoConsentimento", () => {
  it("deriva o texto da declaração do recorte, com dado, finalidade e provedor", () => {
    const texto = textoConsentimento(obterRecorte("refeicao-foto"), "OpenRouter");

    expect(texto).toContain("Provedor: OpenRouter");
    expect(texto).toContain("Estimar alimentos e porções a partir da foto");
    expect(texto).toContain("A foto do prato enviada ao provedor de IA");
    // Campos não sensíveis não entram na lista de consentimento.
    expect(texto).not.toContain("Energia e macros que ainda faltam hoje");
  });

  it("declara ausência de dado sensível quando o recorte não tem nenhum", () => {
    const texto = textoConsentimento(
      obterRecorte("refeicao-texto"),
      "OpenRouter",
    );
    expect(texto).toContain("Nenhum dado sensível");
  });
});
