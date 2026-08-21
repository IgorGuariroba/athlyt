export type CategoriaEquipamento =
  | "machine"
  | "free_weight"
  | "cable"
  | "bodyweight"
  | "accessory";

export interface EquipamentoExterno {
  id: string;
  name: string;
  exercises: readonly string[];
  source: string;
}

export interface EquipamentoCatalogo {
  slug: string;
  nome: string;
  categoria: CategoriaEquipamento;
  exerciciosExternos: readonly string[];
  fonte: string;
}

function slugificar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function categoriaDe(slug: string): CategoriaEquipamento {
  if (/(machine|smith|press|rack|pulldown|extension|curl)/.test(slug)) return "machine";
  if (/(cable|pulley)/.test(slug)) return "cable";
  if (/(barbell|dumbbell|kettlebell|ez-bar)/.test(slug)) return "free_weight";
  if (/(bodyweight|body-weight|none)/.test(slug)) return "bodyweight";
  return "accessory";
}

export function normalizarEquipamento(externo: EquipamentoExterno): EquipamentoCatalogo {
  const slug = slugificar(externo.id || externo.name);
  return {
    slug,
    nome: externo.name.trim(),
    categoria: categoriaDe(slug),
    exerciciosExternos: [...new Set(externo.exercises.map((exercicio) => exercicio.trim()).filter(Boolean))],
    fonte: externo.source,
  };
}
