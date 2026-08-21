import type { DefinicaoEquipamento } from "./equipamentos";

const TIPOS: readonly [string, string, DefinicaoEquipamento["categoria"]][] = [
  ["ab_crunch_machine", "Máquina de abdominal", "maquinas"], ["ab_wheel", "Roda abdominal", "acessorios"], ["air_bike", "Air bike", "cardio"],
  ["assisted_pullup_machine", "Máquina de barra fixa assistida", "maquinas"], ["back_extension_machine", "Máquina de extensão lombar", "maquinas"], ["barbell", "Barra", "pesos-livres"],
  ["battle_rope", "Corda naval", "acessorios"], ["bicep_curl_machine", "Máquina de bíceps", "maquinas"], ["cable", "Cabo", "cabos"],
  ["chest_fly_machine", "Voador / crucifixo", "maquinas"], ["chest_press_machine", "Supino máquina", "maquinas"], ["dip_machine", "Máquina de paralelas", "maquinas"],
  ["dip_station", "Estação de paralelas", "bancos-e-suportes"], ["dumbbell", "Halteres", "pesos-livres"], ["ez_bar", "Barra W", "pesos-livres"],
  ["flat_bench", "Banco reto", "bancos-e-suportes"], ["glute_ham_developer", "Banco glúteo-isquiotibiais", "bancos-e-suportes"], ["hack_squat", "Hack squat", "maquinas"],
  ["hip_abduction_machine", "Máquina abdutora", "maquinas"], ["hip_adduction_machine", "Máquina adutora", "maquinas"],
  ["leg_curl", "Mesa flexora", "maquinas"], ["leg_extension", "Cadeira extensora", "maquinas"], ["leg_press", "Leg press", "maquinas"],
  ["plyo_box", "Caixa pliométrica", "acessorios"], ["pull_up_bar", "Barra fixa", "bancos-e-suportes"], ["resistance_band", "Elástico", "acessorios"],
  ["rings", "Argolas", "acessorios"], ["seated_calf_raise_machine", "Panturrilha sentada", "maquinas"], ["shoulder_press_machine", "Desenvolvimento máquina", "maquinas"],
  ["smith_machine", "Máquina Smith", "maquinas"], ["standing_calf_raise_machine", "Panturrilha em pé", "maquinas"], ["trap_bar", "Barra hexagonal", "pesos-livres"], ["tricep_extension_machine", "Máquina de tríceps", "maquinas"],
];

const IDS_JA_CATALOGADOS = new Set([
  "dumbbell", "ez_bar", "kettlebell", "pull_up_bar", "dip_station", "resistance_band",
  "flat_bench", "leg_press", "hack_squat", "smith_machine", "leg_curl", "leg_extension",
  "chest_press_machine", "chest_fly_machine", "battle_rope",
]);

function chaveRotulo(rotulo: string): string {
  return rotulo.toLocaleLowerCase("pt-BR").replace(/s$/, "");
}

const ROTULOS_JA_CATALOGADOS = new Set([
  "halter", "barra w", "kettlebell", "barra fixa", "paralela", "elástico", "banco reto",
  "leg press", "hack squat", "máquina smith", "mesa flexora", "cadeira extensora",
  "supino máquina", "voador / crucifixo", "corda naval",
]);

export const EQUIPAMENTOS_REPDB: readonly DefinicaoEquipamento[] = TIPOS
  .filter(([id, rotulo]) => !IDS_JA_CATALOGADOS.has(id) && !ROTULOS_JA_CATALOGADOS.has(chaveRotulo(rotulo)))
  .map(([id, rotulo, categoria]) => ({ id, rotulo, categoria, presentePor: [] }));
