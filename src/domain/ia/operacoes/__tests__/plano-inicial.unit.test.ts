import { describe, expect, it, vi } from "vitest";

const decidir = vi.fn();
vi.mock("../../decidir", () => ({ decidir: (...args: unknown[]) => decidir(...args) }));

const { gerarPlanoInicialComIA, planoInicialSchema } = await import("../plano-inicial");

const nucleo = {
  perfilVersao: 7,
  modoConservador: false,
};

const plano = {
  regraVersao: "agent-plano-v1",
  modoConservador: false,
  prioridadesCorporais: ["ombros"],
  perfilVersao: 7,
  bloco: {
    duracaoSemanas: 6,
    divisao: "Superior / Inferior",
    dias: [],
  },
  nutricao: {
    calorias: 2400,
    proteinaG: 160,
    carboidratosG: 280,
    gordurasG: 70,
    fibrasG: 30,
    estrategia: "Manutenção com proteína distribuída",
    refeicoes: [],
    explicacoes: {
      calorias: {
        porque: "Estimativa de manutenção para 80 kg, 180 cm e 35 anos, com atividade moderada.",
        dadosUsados: [
          { campo: "pesoKg", valor: "80" },
          { campo: "alturaCm", valor: "180" },
          { campo: "idadeAnos", valor: "35" },
          { campo: "sexoBiologico", valor: "masculino" },
          { campo: "nivelAtividade", valor: "moderado" },
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
  dadosUsados: ["triagem-completa", "linha-base-corporal", "metas-proporcao"],
};

const exercicioValido = {
  exercicioId: "supino-barra",
  nome: "Supino reto com barra",
  padrao: "empurrar-horizontal",
  series: 3,
  repeticoes: "6-10",
  rir: 2,
  descansoSeg: 120,
  justificativa: "Composto principal de empurrar horizontal",
  comoExecutar: "Deite no banco, mantenha os pés firmes e empurre a barra com controle.",
  explicacao: {
    porque: "Você tem barra e banco na academia e 60 minutos por sessão, o que comporta um composto pesado.",
    dadosUsados: [{ campo: "equipamentos", valor: "barra olímpica, banco reto" }],
  },
};

/** Plano mínimo que satisfaz o schema inteiro, base das variações inválidas. */
const planoValido = {
  ...plano,
  bloco: {
    ...plano.bloco,
    dias: [{
      id: "dia-1",
      nome: "Superior",
      diaSemana: "segunda",
      exercicios: [exercicioValido],
      explicacao: {
        porque: "Você marcou segunda como dia disponível e a divisão superior abre a semana com mais energia.",
        dadosUsados: [{ campo: "diasDisponiveis", valor: "segunda, quinta" }],
      },
    }],
    explicacao: {
      porque: "Seis semanas correspondem à sua experiência intermediária, com margem para progressão.",
      dadosUsados: [{ campo: "experienciaTreino", valor: "intermediario" }],
    },
  },
  nutricao: {
    ...plano.nutricao,
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
  },
};

describe("gerarPlanoInicialComIA", () => {
  it("envia todo o recorte autorizado ao agent e devolve o plano estruturado", async () => {
    decidir.mockResolvedValue({ status: "ok", valor: plano, contexto: {}, modeloResolvido: "anthropic/claude-sonnet-4.5", degradado: false });

    const resultado = await gerarPlanoInicialComIA({
      userId: "u1",
      nucleo,
      consentimentos: ["triagem-completa", "fotos-corporais", "linha-base-corporal", "metas-proporcao", "historico-importado"],
      triagemCompleta: {
        objetivoComposicao: "ganhar-massa",
        horasSono: 8,
        nivelAtividade: "moderado",
        orcamentoAlimentar: "medio",
        tempoPreparoMin: 30,
        pesoKg: 80,
        dataNascimento: "1990-01-01",
        lesoes: ["joelho"],
        equipamentos: ["halteres"],
      },
      fotosCorporais: [{
        id: "f1",
        pose: "frente",
        observadoEm: "2026-08-13",
        dados: new Uint8Array([1, 2, 3]),
        mediaType: "image/jpeg",
      }],
      linhaBaseCorporal: {
        medicoes: [{ id: "m1", userId: "u1", regiao: "cintura", lado: "unico", valorMm: 820, qualidade: "alta", observadoEm: "2026-08-14", createdAt: "2026-08-14" }],
        pesos: [{ id: "p1", userId: "u1", pesoGramas: 80000, observadoEm: "2026-08-14", createdAt: "2026-08-14" }],
        gorduras: [],
        avaliacoesVisuais: [],
        fotosDisponiveis: [{ id: "f1", observadoEm: "2026-08-13" }],
      },
      metasProporcao: [{ id: "meta1", userId: "u1", ativa: true, regiao: "ombros", atualMm: 1100, faixaMinMm: 1120, faixaMaxMm: 1160, metaCicloMm: 1130, direcao: "aumentar", confianca: "moderada", justificativa: "Prioridade do ciclo", createdAt: "2026-08-14" }],
      historicoImportado: { disponivel: false },
      origem: { tela: "resumo-triagem", rota: "/triagem/resumo", gatilho: "clique-gerar-meu-plano" },
    });

    expect(resultado).toMatchObject({ status: "ok", valor: plano });
    expect(decidir).toHaveBeenCalledWith(expect.objectContaining({
      userId: "u1",
      operacao: "plano-inicial",
      nucleo,
      consentimentos: ["triagem-completa", "fotos-corporais", "linha-base-corporal", "metas-proporcao", "historico-importado"],
      origem: { tela: "resumo-triagem", rota: "/triagem/resumo", gatilho: "clique-gerar-meu-plano" },
      dados: {
        "triagem-completa": {
          horasSono: 8,
          nivelAtividade: "moderado",
          objetivoComposicao: "ganhar-massa",
          orcamentoAlimentar: "medio",
          tempoPreparoMin: 30,
        },
        "fotos-corporais": [{ id: "f1", pose: "frente", observadoEm: "2026-08-13" }],
        "linha-base-corporal": {
          medicoes: [{ regiao: "cintura", lado: "unico", valorMm: 820, qualidade: "alta", observadoEm: "2026-08-14" }],
          pesos: [{ observadoEm: "2026-08-14", pesoKg: 80 }],
          gorduras: [],
          avaliacoesVisuais: [],
        },
        "metas-proporcao": [{ regiao: "ombros", atualMm: 1100, faixaMinMm: 1120, faixaMaxMm: 1160, metaCicloMm: 1130, direcao: "aumentar", confianca: "moderada", justificativa: "Prioridade do ciclo" }],
        "historico-importado": { disponivel: false },
      },
      imagens: [{ dados: new Uint8Array([1, 2, 3]), mediaType: "image/jpeg" }],
    }));
    expect(decidir).toHaveBeenCalledWith(expect.objectContaining({
      ferramentas: expect.objectContaining({ consultarExercicio: expect.anything() }),
    }));
  });

  it("rejeita exercício sem explicação ancorada em dados do atleta", () => {
    const semExplicacao = {
      ...plano,
      bloco: {
        ...plano.bloco,
        dias: [{
          id: "dia-1",
          nome: "Superior",
          diaSemana: "segunda",
          exercicios: [{
            exercicioId: "supino-barra",
            nome: "Supino reto com barra",
            padrao: "empurrar-horizontal",
            series: 3,
            repeticoes: "6-10",
            rir: 2,
            descansoSeg: 120,
            justificativa: "Ótimo para peito",
          }],
        }],
      },
    };

    expect(planoInicialSchema.safeParse(semExplicacao).success).toBe(false);
  });

  it("aceita plano completo com explicação em toda decisão", () => {
    const analise = planoInicialSchema.safeParse(planoValido);
    expect(analise.error?.issues ?? []).toEqual([]);
    expect(analise.success).toBe(true);
  });

  it("rejeita nutrição sem explicação para cada meta", () => {
    const nutricaoSemExplicacoes = { ...planoValido.nutricao, explicacoes: undefined };
    expect(planoInicialSchema.safeParse({ ...planoValido, nutricao: nutricaoSemExplicacoes }).success).toBe(false);
  });

  it("rejeita calorias explicadas sem ancorar em idade, peso, altura, sexo ou atividade", () => {
    const semAncora = {
      ...planoValido,
      nutricao: {
        ...planoValido.nutricao,
        explicacoes: {
          ...planoValido.nutricao.explicacoes,
          calorias: {
            porque: "Escolhemos essa energia porque você quer ganhar massa neste ciclo de treino.",
            dadosUsados: [{ campo: "objetivoComposicao", valor: "ganhar-massa" }],
          },
        },
      },
    };

    expect(planoInicialSchema.safeParse(semAncora).success).toBe(false);
  });

  it("rejeita escolha de exercício ancorada apenas em peso corporal", () => {
    const ancoraErrada = {
      ...planoValido,
      bloco: {
        ...planoValido.bloco,
        dias: [{
          ...planoValido.bloco.dias[0],
          exercicios: [{
            ...exercicioValido,
            explicacao: {
              porque: "Seus 80 kg de peso corporal indicam boa base de força para este movimento.",
              dadosUsados: [{ campo: "pesoKg", valor: "80" }],
            },
          }],
        }],
      },
    };

    expect(planoInicialSchema.safeParse(ancoraErrada).success).toBe(false);
  });

  it("rejeita explicação que cita dado nunca enviado ao agent", () => {
    const campoInventado = {
      ...plano,
      bloco: {
        ...plano.bloco,
        dias: [{
          id: "dia-1",
          nome: "Superior",
          diaSemana: "segunda",
          exercicios: [{
            exercicioId: "supino-barra",
            nome: "Supino reto com barra",
            padrao: "empurrar-horizontal",
            series: 3,
            repeticoes: "6-10",
            rir: 2,
            descansoSeg: 120,
            justificativa: "Composto principal de empurrar horizontal",
            explicacao: {
              porque: "Seu exame de sangue recente indica disposição para carga alta neste padrão.",
              dadosUsados: [{ campo: "exameDeSangue", valor: "normal" }],
            },
          }],
        }],
      },
    };

    expect(planoInicialSchema.safeParse(campoInventado).success).toBe(false);
  });

  it("rejeita exercício inventado pelo modelo", () => {
    const invalido = {
      ...plano,
      bloco: {
        ...plano.bloco,
        dias: [{
          id: "dia-1",
          nome: "Superior",
          diaSemana: "segunda",
          exercicios: [{
            exercicioId: "exercicio-inventado",
            nome: "Exercício inventado",
            padrao: "empurrar-horizontal",
            series: 3,
            repeticoes: "8-12",
            rir: 2,
            descansoSeg: 90,
            justificativa: "Teste",
          }],
        }],
      },
    };

    expect(planoInicialSchema.safeParse(invalido).success).toBe(false);
  });
});
