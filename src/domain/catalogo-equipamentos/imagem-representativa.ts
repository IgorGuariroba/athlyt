export interface ExercicioComImagem {
  equipment?: string;
  image: string;
}

export function imagemRepresentativa(
  equipamento: string,
  exercicios: readonly ExercicioComImagem[],
): string | null {
  return exercicios.find((exercicio) => exercicio.equipment === equipamento)?.image ?? null;
}
