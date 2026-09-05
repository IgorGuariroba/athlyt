import type { ConfiancaCorporal, MetaProporcao } from "@/domain/medicoes";
import type { RespostasTriagem } from "@/domain/triagem/etapas";
import { avaliarSuficiencia } from "@/domain/triagem/suficiencia";
import { idadeEmAnos } from "@/domain/ia/contexto/nucleo";
import {
  exerciciosElegiveis,
  regioesLesionadas,
  type DefinicaoExercicio,
  type PadraoMovimento,
} from "./exercicios";
import type { DiaTreino, ExercicioPlanejado, PlanoGerado } from "./tipos";

export const REGRA_PLANO_VERSAO = "motor-plano-v2";

const PADROES: Record<number, { nome: string; padroes: PadraoMovimento[] }[]> = {
  1: [{ nome: "Corpo inteiro", padroes: ["agachar", "empurrar-horizontal", "puxar-horizontal", "dobradica", "elevacao-lateral", "core"] }],
  2: [
    { nome: "Corpo inteiro A", padroes: ["agachar", "empurrar-horizontal", "puxar-horizontal", "elevacao-lateral", "flexao-cotovelo"] },
    { nome: "Corpo inteiro B", padroes: ["dobradica", "empurrar-vertical", "puxar-vertical", "extensao-cotovelo", "core"] },
  ],
  3: [
    { nome: "Superior", padroes: ["empurrar-horizontal", "puxar-vertical", "puxar-horizontal", "elevacao-lateral", "flexao-cotovelo", "extensao-cotovelo"] },
    { nome: "Inferior", padroes: ["agachar", "dobradica", "extensao-joelho", "flexao-joelho", "panturrilha", "core"] },
    { nome: "Superior e proporções", padroes: ["empurrar-horizontal", "puxar-vertical", "puxar-horizontal", "elevacao-lateral", "flexao-cotovelo", "extensao-cotovelo"] },
  ],
  4: [
    { nome: "Superior A", padroes: ["empurrar-horizontal", "puxar-vertical", "puxar-horizontal", "elevacao-lateral", "extensao-cotovelo"] },
    { nome: "Inferior A", padroes: ["agachar", "dobradica", "panturrilha", "core"] },
    { nome: "Superior B", padroes: ["puxar-vertical", "empurrar-horizontal", "puxar-horizontal", "elevacao-lateral", "flexao-cotovelo"] },
    { nome: "Inferior B", padroes: ["dobradica", "agachar", "flexao-joelho", "panturrilha", "core"] },
  ],
  5: [
    { nome: "Empurrar", padroes: ["empurrar-horizontal", "empurrar-vertical", "elevacao-lateral", "extensao-cotovelo"] },
    { nome: "Puxar", padroes: ["puxar-vertical", "puxar-horizontal", "flexao-cotovelo"] },
    { nome: "Pernas", padroes: ["agachar", "dobradica", "extensao-joelho", "flexao-joelho", "panturrilha"] },
    { nome: "Superior", padroes: ["empurrar-horizontal", "puxar-vertical", "puxar-horizontal", "elevacao-lateral"] },
    { nome: "Inferior e core", padroes: ["agachar", "dobradica", "panturrilha", "core"] },
  ],
};

function prescricao(ex: DefinicaoExercicio, experiencia: string | undefined, conservador: boolean, prioridades: ReadonlySet<string> = new Set()): ExercicioPlanejado {
  const iniciante = conservador || experiencia === "nunca-treinou" || experiencia === "iniciante";
  const priorizado = (prioridades.has("ombros") && ["elevacao-lateral", "empurrar-vertical"].includes(ex.padrao))
    || (prioridades.has("braco") && ["flexao-cotovelo", "extensao-cotovelo"].includes(ex.padrao))
    || (prioridades.has("panturrilha") && ex.padrao === "panturrilha");
  return {
    exercicioId: ex.id,
    nome: ex.nome,
    padrao: ex.padrao,
    series: (ex.composto ? (iniciante ? 2 : 3) : 2) + (priorizado && !iniciante ? 1 : 0),
    repeticoes: ex.id === "prancha" ? "30–45" : ex.composto ? "6–10" : "10–15",
    protocolo: ex.protocolo ?? "repeticoes",
    rir: iniciante ? 3 : 2,
    descansoSeg: ex.composto ? 120 : 75,
    justificativa: ex.justificativa,
  };
}

function calcularNutricao(respostas: RespostasTriagem, conservador: boolean, agora: Date, composicaoConfiavel?: boolean) {
  const peso = respostas.pesoKg ?? 70;
  const altura = respostas.alturaCm ?? 170;
  const idade = respostas.dataNascimento ? idadeEmAnos(respostas.dataNascimento, agora) : 30;
  const sexoAjuste = respostas.sexoBiologico === "feminino" ? -161 : 5;
  const tmb = 10 * peso + 6.25 * altura - 5 * idade + sexoAjuste;
  const fatores = { sedentario: 1.2, leve: 1.35, moderado: 1.5, ativo: 1.65, "muito-ativo": 1.8 } as const;
  const manutencao = tmb * (respostas.nivelAtividade ? fatores[respostas.nivelAtividade] : 1.35);
  const amplitude = composicaoConfiavel === false ? 0.5 : 1;
  const ajuste = conservador ? 0 : respostas.objetivoComposicao === "perder-gordura" ? -0.1 * amplitude : respostas.objetivoComposicao === "ganhar-massa" ? 0.08 * amplitude : 0;
  const calorias = Math.round((manutencao * (1 + ajuste)) / 50) * 50;
  const proteinaG = Math.round(peso * (conservador ? 1.6 : 1.8));
  const gordurasG = Math.round(peso * 0.8);
  const carboidratosG = Math.max(0, Math.round((calorias - proteinaG * 4 - gordurasG * 9) / 4));
  const percentuais = [25, 35, 25, 15];
  const nomes = ["Café da manhã", "Almoço", "Jantar", "Lanche"];
  const restricoes = new Set((respostas.restricoesAlimentares ?? []).map((r) => r.toLowerCase()));
  const vegetal = restricoes.has("vegano") || restricoes.has("vegetariano");
  const semLactose = restricoes.has("sem lactose") || vegetal;
  const semGluten = restricoes.has("sem glúten") || restricoes.has("sem gluten");
  const semAmendoim = restricoes.has("alergia a amendoim");
  const economico = respostas.orcamentoAlimentar === "baixo";
  const cerealCafe = semGluten ? "Tapioca 80 g" : "Aveia 60 g";
  const paoLanche = semGluten ? "Tapioca 80 g" : "Pão integral 2 fatias";
  const pastaLanche = semAmendoim ? "Homus 40 g" : "Pasta de amendoim 20 g";
  const itens = vegetal
    ? [
        [cerealCafe, semLactose ? "Bebida de soja 250 ml" : "Iogurte 170 g", "Banana 1 un"],
        ["Arroz 150 g", economico ? "Feijão 180 g" : "Tofu 180 g", "Legumes 150 g"],
        ["Batata 250 g", "Lentilha 180 g", "Salada 150 g"],
        [paoLanche, pastaLanche, "Fruta 1 un"],
      ]
    : [
        [cerealCafe, semLactose ? "Bebida sem lactose 250 ml" : "Leite 250 ml", "Ovos 2 un"],
        ["Arroz 150 g", economico ? "Frango 150 g" : "Carne bovina magra 150 g", "Feijão 100 g", "Legumes 150 g"],
        ["Batata 250 g", "Frango 150 g", "Salada 150 g"],
        [semLactose ? "Iogurte sem lactose 170 g" : "Iogurte 170 g", "Fruta 1 un", "Castanhas 15 g"],
      ];
  return {
    calorias, proteinaG, carboidratosG, gordurasG, fibrasG: Math.round(calorias / 100),
    estrategia: conservador
      ? "Manutenção conservadora até que o perfil tenha dados suficientes; sem déficit ou superávit agressivo."
      : ajuste < 0 ? "Déficit moderado de 10%, preservando proteína e desempenho."
      : ajuste > 0 ? "Superávit moderado de 8%, priorizando ganho gradual de massa."
      : "Energia próxima da manutenção para recomposição corporal.",
    refeicoes: percentuais.map((percentual, i) => {
      const nome = nomes[i];
      const itensDaRefeicao = itens[i];
      if (!nome || !itensDaRefeicao) throw new Error("Tabela de refeições desalinhada.");
      return { nome, percentual, calorias: Math.round(calorias * percentual / 100), proteinaG: Math.round(proteinaG * percentual / 100), itens: itensDaRefeicao };
    }),
  };
}

export function gerarPlano(entrada: { perfilVersao: number; respostas: RespostasTriagem; agora?: Date; confiancaCorporal?: ConfiancaCorporal; metasProporcao?: MetaProporcao[] }): PlanoGerado {
  const { respostas } = entrada;
  const prioridades = new Set((entrada.metasProporcao ?? []).filter((meta) => meta.direcao === "aumentar" && meta.confianca !== "baixa").map((meta) => meta.regiao));
  const modoConservador = avaliarSuficiencia(respostas).modoConservador;
  const equipamentos = [...(respostas.equipamentos ?? [])];
  const elegiveis = exerciciosElegiveis({ equipamentos, regioesLesionadas: regioesLesionadas(respostas.lesoes), modoConservador });
  const porPadrao = new Map<PadraoMovimento, DefinicaoExercicio[]>();
  for (const ex of elegiveis) porPadrao.set(ex.padrao, [...(porPadrao.get(ex.padrao) ?? []), ex]);

  const diasPerfil = respostas.diasDisponiveis?.length ? respostas.diasDisponiveis : ["segunda", "quinta"];
  const frequencia = Math.min(modoConservador ? 3 : 5, Math.max(1, diasPerfil.length));
  const modelos = PADROES[frequencia];
  if (!modelos) throw new Error(`Sem modelo de divisão para frequência ${frequencia}.`);
  const dias: DiaTreino[] = modelos.map((modelo, i) => {
    // Cardio é uma modalidade transversal: entra uma vez por sessão,
    // preservando o treino de força e permitindo validar seu protocolo.
    const padroesDoDia: PadraoMovimento[] = ["cardio", ...modelo.padroes];
    const limite = Math.max(3, Math.min(padroesDoDia.length, Math.floor((respostas.duracaoSessaoMin ?? 45) / 9)));
    const usados = new Set<string>();
    const exercicios = padroesDoDia.flatMap((padrao) => {
      const opcoes = porPadrao.get(padrao) ?? [];
      const escolha = opcoes.find((e) => !usados.has(e.id)) ?? opcoes[0];
      if (!escolha) return [];
      usados.add(escolha.id);
      return [prescricao(escolha, respostas.experienciaTreino, modoConservador, prioridades)];
    }).slice(0, limite);
    return { id: `dia-${i + 1}`, nome: modelo.nome, diaSemana: diasPerfil[i] ?? `dia-${i + 1}`, exercicios };
  });

  const experiencia = respostas.experienciaTreino;
  const duracaoSemanas = modoConservador || experiencia === "nunca-treinou" || experiencia === "iniciante" ? 4 : experiencia === "intermediario" ? 6 : 8;
  return {
    regraVersao: REGRA_PLANO_VERSAO,
    modoConservador,
    confiancaCorporal: entrada.confiancaCorporal,
    metasProporcao: entrada.metasProporcao,
    prioridadesCorporais: [...prioridades],
    perfilVersao: entrada.perfilVersao,
    bloco: { duracaoSemanas, divisao: dias.map((d) => d.nome).join(" / "), dias },
    nutricao: calcularNutricao(respostas, modoConservador, entrada.agora ?? new Date(), entrada.confiancaCorporal ? entrada.confiancaCorporal.composicaoCorporal === "confiavel" : undefined),
    dadosUsados: [...Object.keys(respostas), ...(entrada.metasProporcao?.length ? ["medicoesCorporais", "metasProporcao"] : [])].sort(),
  };
}

export function substituirExercicio(plano: PlanoGerado, entrada: { diaId: string; exercicioId: string; novoExercicioId: string }, respostas: RespostasTriagem): PlanoGerado {
  const atual = plano.bloco.dias.flatMap((d) => d.exercicios).find((e) => e.exercicioId === entrada.exercicioId);
  if (!atual) throw new Error("Exercício original não encontrado no plano.");
  const novo = exerciciosElegiveis({ equipamentos: respostas.equipamentos ?? [], regioesLesionadas: regioesLesionadas(respostas.lesoes), modoConservador: plano.modoConservador }).find((e) => e.id === entrada.novoExercicioId && e.padrao === atual.padrao);
  if (!novo) throw new Error("Substituição não preserva o estímulo ou não é viável.");
  return { ...plano, bloco: { ...plano.bloco, dias: plano.bloco.dias.map((dia) => dia.id !== entrada.diaId ? dia : { ...dia, exercicios: dia.exercicios.map((e) => e.exercicioId !== entrada.exercicioId ? e : { ...prescricao(novo, respostas.experienciaTreino, plano.modoConservador), series: e.series, repeticoes: e.repeticoes, rir: e.rir, descansoSeg: e.descansoSeg }) }) } };
}
