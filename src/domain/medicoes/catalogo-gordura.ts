export const METODOS_GORDURA = [
  {
    id: "adipometro",
    rotulo: "Adipômetro",
    descricao: "Dobras cutâneas",
  },
  {
    id: "bioimpedancia",
    rotulo: "Bioimpedância",
    descricao: "Balança ou aparelho BIA",
  },
  {
    id: "dexa",
    rotulo: "DEXA / DXA",
    descricao: "Exame de imagem",
  },
  {
    id: "hidrostatica",
    rotulo: "Hidrostática",
    descricao: "Pesagem na água",
  },
  {
    id: "fita",
    rotulo: "Estimativa por fita",
    descricao: "Fórmula com circunferências",
  },
  {
    id: "outro",
    rotulo: "Outro método",
    descricao: "Informe nos detalhes",
  },
] as const;

export type MetodoGordura = (typeof METODOS_GORDURA)[number]["id"];

const IDS = new Set<string>(METODOS_GORDURA.map((metodo) => metodo.id));

export function metodoGorduraValido(valor: string): valor is MetodoGordura {
  return IDS.has(valor);
}
