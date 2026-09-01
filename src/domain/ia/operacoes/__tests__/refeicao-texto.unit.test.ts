import { beforeEach, describe, expect, it, vi } from "vitest";

const decidir = vi.fn();
vi.mock("../../decidir", () => ({ decidir: (...args: unknown[]) => decidir(...args) }));

const { estimarRefeicaoPorDescricao, refeicaoTextoSchema } = await import("../refeicao-texto");
const { transcreverAudioDaRefeicao, refeicaoAudioSchema } = await import("../refeicao-audio");

const nucleo = { perfilVersao: 3, modoConservador: false };

beforeEach(() => decidir.mockReset());

const estimativaValida = {
  nome: "Almoço: arroz, bife e salada",
  itens: [
    {
      descricao: "Arroz branco cozido",
      porcaoDescrita: "duas colheres de sopa",
      quantidade: 50,
      unidade: "g" as const,
      calorias: 64, proteinaG: 1, carboidratosG: 14, gordurasG: 0, fibrasG: 1,
      confianca: "media" as const,
    },
  ],
  limitacoes: ["O preparo do arroz não foi informado."],
  confianca: "media" as const,
};

function decisaoOk(valor: unknown = estimativaValida) {
  return {
    status: "ok",
    valor,
    contexto: {},
    modeloResolvido: "google/gemini-2.5-flash-lite",
    degradado: false,
  };
}

describe("estimarRefeicaoPorDescricao", () => {
  it("decide como operação própria e leva a descrição do atleta ao recorte", async () => {
    decidir.mockResolvedValue(decisaoOk());

    await estimarRefeicaoPorDescricao({
      userId: "u1",
      nucleo,
      descricao: "  Duas colheres de arroz e um bife  ",
      origemDescricao: "texto",
    });

    const chamada = decidir.mock.calls[0][0] as {
      operacao: string;
      dados: Record<string, { texto?: string; origem?: string }>;
    };
    expect(chamada.operacao).toBe("refeicao-texto");
    // A descrição precisa chegar ao modelo como o atleta a escreveu:
    // é ela que sustenta a auditoria do registro depois.
    expect(chamada.dados["descricao-livre"].texto).toBe("Duas colheres de arroz e um bife");
  });

  it("distingue transcrição de áudio de texto escrito no contexto enviado", async () => {
    decidir.mockResolvedValue(decisaoOk());

    await estimarRefeicaoPorDescricao({
      userId: "u1",
      nucleo,
      descricao: "Comi dois ovos",
      origemDescricao: "audio",
    });

    const chamada = decidir.mock.calls[0][0] as {
      dados: Record<string, { origem?: string }>;
      origem: { gatilho: string };
    };
    expect(chamada.dados["descricao-livre"].origem).toMatch(/transcri/i);
    expect(chamada.origem.gatilho).toContain("audio");
  });

  it("nunca envia imagem: descrição não é foto", async () => {
    decidir.mockResolvedValue(decisaoOk());

    await estimarRefeicaoPorDescricao({
      userId: "u1", nucleo, descricao: "Comi dois ovos", origemDescricao: "texto",
    });

    expect((decidir.mock.calls[0][0] as { imagens?: unknown }).imagens).toBeUndefined();
  });

  it("proíbe usar as metas restantes como alvo da estimativa", async () => {
    decidir.mockResolvedValue(decisaoOk());

    await estimarRefeicaoPorDescricao({
      userId: "u1", nucleo, descricao: "Comi dois ovos", origemDescricao: "texto",
      metasRestantes: { calorias: 900 },
    });

    // As metas calibram porções plausíveis; forçar o resultado a
    // fechar a meta descreveria o plano, não a refeição.
    const { instrucao } = decidir.mock.calls[0][0] as { instrucao: string };
    expect(instrucao).toMatch(/Nunca ajuste a estimativa para fechar a meta/i);
  });

  it("proíbe inventar alimento que a descrição não sustenta", async () => {
    decidir.mockResolvedValue(decisaoOk());

    await estimarRefeicaoPorDescricao({
      userId: "u1", nucleo, descricao: "Comi dois ovos", origemDescricao: "texto",
    });

    const { instrucao } = decidir.mock.calls[0][0] as { instrucao: string };
    expect(instrucao).toMatch(/apenas alimentos sustentados pela descrição/i);
  });

  it("aceita estimativa com porção descrita, confiança e limitações", () => {
    expect(refeicaoTextoSchema.safeParse(estimativaValida).success).toBe(true);
  });

  it("aceita líquido declarado em mililitros", () => {
    // Quem diz "tomei uma lata" descreve volume. Forçar gramas obrigava
    // o modelo a inventar densidade e a não dizer que inventou.
    const comBebida = {
      ...estimativaValida,
      itens: [
        { ...estimativaValida.itens[0], descricao: "Coca-Cola Zero", unidade: "ml", quantidade: 350 },
      ],
    };
    expect(refeicaoTextoSchema.safeParse(comBebida).success).toBe(true);
  });

  it("recusa unidade fora de g e ml: o Prato não sabe reescalar o resto", () => {
    const emColheres = {
      ...estimativaValida,
      itens: [{ ...estimativaValida.itens[0], unidade: "colher" }],
    };
    expect(refeicaoTextoSchema.safeParse(emColheres).success).toBe(false);
  });

  it("recusa item sem a porção que o atleta descreveu", () => {
    const semPorcao = {
      ...estimativaValida,
      itens: [{ ...estimativaValida.itens[0], porcaoDescrita: undefined }],
    };
    // Sem ela o atleta revisa gramas que ele nunca disse, e o número
    // deixa de ser reconhecível como a própria memória.
    expect(refeicaoTextoSchema.safeParse(semPorcao).success).toBe(false);
  });

  it("recusa item sem declarar confiança", () => {
    const semConfianca = {
      ...estimativaValida,
      itens: [{ ...estimativaValida.itens[0], confianca: undefined }],
    };
    expect(refeicaoTextoSchema.safeParse(semConfianca).success).toBe(false);
  });

  it("recusa estimativa sem nenhum item: refeição vazia não é registro", () => {
    expect(refeicaoTextoSchema.safeParse({ ...estimativaValida, itens: [] }).success).toBe(false);
  });

  it("recusa saída malformada do provedor", () => {
    expect(refeicaoTextoSchema.safeParse({ resposta: "comeu arroz" }).success).toBe(false);
  });
});

describe("transcreverAudioDaRefeicao", () => {
  it("envia o áudio na operação própria de transcrição", async () => {
    decidir.mockResolvedValue(
      decisaoOk({ transcricao: "Comi dois ovos", trechosIncertos: [] }),
    );

    await transcreverAudioDaRefeicao({
      userId: "u1",
      nucleo,
      audio: { dados: new Uint8Array([1, 2, 3]), mediaType: "audio/webm" },
    });

    const chamada = decidir.mock.calls[0][0] as {
      operacao: string;
      audios: { mediaType: string }[];
    };
    expect(chamada.operacao).toBe("refeicao-audio");
    expect(chamada.audios).toEqual([
      { dados: new Uint8Array([1, 2, 3]), mediaType: "audio/webm" },
    ]);
  });

  it("proíbe o transcritor de estimar macros: quem calcula é a outra operação", async () => {
    decidir.mockResolvedValue(
      decisaoOk({ transcricao: "Comi dois ovos", trechosIncertos: [] }),
    );

    await transcreverAudioDaRefeicao({
      userId: "u1", nucleo, audio: { dados: new Uint8Array([1]), mediaType: "audio/webm" },
    });

    const { instrucao } = decidir.mock.calls[0][0] as { instrucao: string };
    expect(instrucao).toMatch(/Não estime calorias, macros nem gramas/i);
  });

  it("aceita transcrição com trechos incertos declarados", () => {
    expect(
      refeicaoAudioSchema.safeParse({
        transcricao: "Comi dois ovos e pão",
        trechosIncertos: ["pão"],
      }).success,
    ).toBe(true);
  });

  it("recusa transcrição vazia", () => {
    expect(
      refeicaoAudioSchema.safeParse({ transcricao: "", trechosIncertos: [] }).success,
    ).toBe(false);
  });
});
