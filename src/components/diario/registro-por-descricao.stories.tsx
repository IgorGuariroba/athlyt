import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { itemEstimado } from "@/domain/alimentos/prato";
import {
  RegistroPorDescricao,
  type EstimativaDescrita,
  type ResultadoEstimativa,
  type ResultadoRegistro,
  type ResultadoTranscricao,
} from "./registro-por-descricao";

const ESTIMATIVA: EstimativaDescrita = {
  nome: "Almoço: arroz, bife e salada",
  itens: [
    itemEstimado({
      descricao: "Arroz branco cozido",
      quantidadeGramas: 150,
      calorias: 192, proteinaG: 3, carboidratosG: 42, gordurasG: 0, fibrasG: 2,
      confianca: "media", modelo: "google/gemini-2.5-flash-lite", origemEstimativa: "texto",
    }),
    itemEstimado({
      descricao: "Bife de alcatra grelhado",
      quantidadeGramas: 120,
      calorias: 250, proteinaG: 32, carboidratosG: 0, gordurasG: 13, fibrasG: 0,
      confianca: "alta", modelo: "google/gemini-2.5-flash-lite", origemEstimativa: "texto",
    }),
  ],
  porcoesDescritas: ["duas colheres", "um bife médio"],
  limitacoes: ["A quantidade de arroz não foi informada; assumi uma porção usual."],
  confianca: "media",
  descricaoUsada: "Duas colheres de arroz, um bife médio e salada de tomate.",
  origem: "texto",
};

const meta = {
  title: "Diário/RegistroPorDescricao",
  component: RegistroPorDescricao,
  parameters: {
    docs: {
      description: {
        component:
          "Registro Retroativo por texto ou áudio: descrever, revisar a transcrição (só no áudio), revisar a estimativa e confirmar. Quando já existe Consumo Real para a refeição, a confirmação passa por aviso explícito de substituição.",
      },
    },
  },
  args: {
    dia: "2026-08-19",
    horaInicial: "12:30",
    nomeInicial: "Almoço",
    categorias: ["Café da manhã", "Almoço", "Lanche", "Jantar", "Ceia"],
    estimar: async (): Promise<ResultadoEstimativa> => ({ ok: true, estimativa: ESTIMATIVA }),
    transcrever: async (): Promise<ResultadoTranscricao> => ({
      ok: true,
      transcricao: "Duas colheres de arroz, um bife médio e salada de tomate.",
      trechosIncertos: ["salada de tomate"],
    }),
    registrar: async (): Promise<ResultadoRegistro> => ({ ok: true }),
  },
} satisfies Meta<typeof RegistroPorDescricao>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RefeicaoNaoPlanejada: Story = { args: { nomeInicial: "" } };

export const DivergenciaDeRefeicaoPlanejada: Story = {
  args: { refeicaoRef: "1-Almoço" },
};

export const SubstituindoConsumoExistente: Story = {
  args: {
    refeicaoRef: "1-Almoço",
    consumoExistente: {
      nome: "Almoço",
      macros: { calorias: 620, proteinaG: 41, carboidratosG: 63, gordurasG: 18, fibrasG: 7 },
    },
  },
};

export const EstimativaIndisponivel: Story = {
  args: {
    estimar: async (): Promise<ResultadoEstimativa> => ({
      ok: false,
      erro: "A estimativa está indisponível agora. Sua descrição continua aqui — tente de novo em instantes.",
    }),
  },
};
