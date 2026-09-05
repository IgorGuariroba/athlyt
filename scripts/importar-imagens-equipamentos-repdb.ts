import { writeFile } from "node:fs/promises";

const URL_DATASET = "https://exercise-dataset.com/exercises.json";
const URL_IMAGENS = "https://exercise-dataset.com/";
const SAIDA = "src/domain/triagem/imagens-equipamentos-repdb.ts";

const ALIASES: Record<string, string[]> = {
  halteres: ["dumbbell"],
  "barra-olimpica": ["barbell"],
  "barra-w": ["ez_bar", "ez_barbell"],
  anilhas: ["weight_plate"],
  kettlebell: ["kettlebell"],
  "barra-fixa": ["pull_up_bar"],
  "banco-reto": ["flat_bench"],
  "banco-inclinado": ["flat_bench"],
  "cadeira-extensora": ["leg_extension"],
  "mesa-flexora": ["leg_curl"],
  "supino-maquina": ["chest_press_machine"],
  voador: ["chest_fly_machine"],
  "remada-maquina": ["cable"],
  "panturrilha-maquina": ["standing_calf_raise_machine", "seated_calf_raise_machine"],
  "polia-alta": ["cable"],
  "polia-baixa": ["cable"],
  paralelas: ["dip_station", "dip_machine"],
  elasticos: ["resistance_band", "band"],
  "crossover": ["cable", "functional_trainer"],
  cable: ["cable"],
  "corda-naval": ["battle_rope"],
  trx: ["rings"],
  smith: ["smith_machine"],
  "leg-press": ["leg_press_machine", "leg_press"],
  "hack-squat": ["hack_squat_machine", "hack_squat"],
  ab_crunch_machine: ["ab_crunch_machine"], ab_wheel: ["ab_wheel"], air_bike: ["air_bike"], assisted_pullup_machine: ["assisted_pullup_machine"],
  back_extension_machine: ["back_extension_machine"], barbell: ["barbell"], battle_rope: ["battle_rope"], bicep_curl_machine: ["bicep_curl_machine"],
  chest_fly_machine: ["chest_fly_machine"], chest_press_machine: ["chest_press_machine"], dip_machine: ["dip_machine"], dip_station: ["dip_station"], dumbbell: ["dumbbell"],
  ez_bar: ["ez_bar"], flat_bench: ["flat_bench"], glute_ham_developer: ["glute_ham_developer"], hip_abduction_machine: ["hip_abduction_machine"],
  hip_adduction_machine: ["hip_adduction_machine"], leg_curl: ["leg_curl"], leg_extension: ["leg_extension"], leg_press: ["leg_press"],
  plyo_box: ["plyo_box"], pull_up_bar: ["pull_up_bar"], resistance_band: ["resistance_band"], rings: ["rings"], seated_calf_raise_machine: ["seated_calf_raise_machine"],
  shoulder_press_machine: ["shoulder_press_machine"], standing_calf_raise_machine: ["standing_calf_raise_machine"], trap_bar: ["trap_bar"], tricep_extension_machine: ["tricep_extension_machine"],
};

interface Registro { equipment?: string; images?: { flat?: { start?: string; peak?: string; main?: string } } }

async function principal() {
  const resposta = await fetch(URL_DATASET);
  if (!resposta.ok) throw new Error(`RepDB respondeu ${resposta.status}`);
  const corpo = (await resposta.json()) as { exercises: Registro[] };
  const imagens: Record<string, string> = {};

  for (const [equipamento, aliases] of Object.entries(ALIASES)) {
    const exercicio = corpo.exercises.find((item) => item.equipment && aliases.includes(item.equipment));
    const caminho = exercicio?.images?.flat?.start ?? exercicio?.images?.flat?.main;
    if (caminho) imagens[equipamento] = `${URL_IMAGENS}${caminho}`;
  }

  await writeFile(SAIDA, `/** Gerado por scripts/importar-imagens-equipamentos-repdb.ts. */\nexport const IMAGENS_EQUIPAMENTOS_REPDB = ${JSON.stringify(imagens, null, 2)} as const;\n`);
  console.log(`RepDB: ${Object.keys(imagens).length} imagens mapeadas em ${SAIDA}`);
}

principal().catch((erro: unknown) => { console.error(erro); process.exitCode = 1; });
