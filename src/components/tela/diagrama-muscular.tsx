import type { GrupoMuscular } from "@/domain/plano/exercicios";
import { cn } from "@/lib/utils";

/**
 * Diagrama de músculos-alvo da Mídia de Execução, complementar ao
 * fallback de instruções em texto.
 *
 * Silhueta estilizada — não uma ilustração anatômica licenciada — na
 * mesma linguagem linear e tonal do resto do produto: sem gradiente,
 * sem foto de banco de imagens e com cor apenas para marcar a região
 * trabalhada.
 *
 * Cada grupo muscular pertence a exatamente uma das duas vistas.
 * Mostrar as duas ao mesmo tempo obrigaria o atleta a decidir qual
 * lado olhar; a vista é escolhida pelo grupo primário do exercício e
 * rotulada por extenso, porque a diferença frente/costas não pode
 * depender só da orientação do desenho.
 */

const VISTA_POR_GRUPO: Record<GrupoMuscular, "frente" | "costas"> = {
  peito: "frente",
  ombros: "frente",
  biceps: "frente",
  quadriceps: "frente",
  core: "frente",
  costas: "costas",
  triceps: "costas",
  gluteos: "costas",
  posteriores: "costas",
  panturrilhas: "costas",
  cardio: "frente",
};

const ROTULO_VISTA: Record<"frente" | "costas", string> = {
  frente: "Vista frontal",
  costas: "Vista posterior",
};

/** Rótulo da vista (frontal/posterior) que exibe o grupo muscular. */
export function rotuloVistaDoGrupo(grupo: GrupoMuscular): string {
  return ROTULO_VISTA[VISTA_POR_GRUPO[grupo]];
}

type Forma = {
  grupo: GrupoMuscular | null;
  d?: string;
  rect?: { x: number; y: number; width: number; height: number; rx: number };
  circle?: { cx: number; cy: number; r: number };
};

const CABECA_PESCOCO: Forma[] = [
  { grupo: null, circle: { cx: 50, cy: 14, r: 10 } },
  { grupo: null, rect: { x: 45, y: 22, width: 10, height: 7, rx: 2 } },
];

const BRACOS_NEUTROS_ANTEBRACO: Forma[] = [
  { grupo: null, rect: { x: 12, y: 64, width: 9, height: 24, rx: 4 } },
  { grupo: null, rect: { x: 79, y: 64, width: 9, height: 24, rx: 4 } },
];

const PERNAS_NEUTRAS_INFERIOR_FRENTE: Forma[] = [
  { grupo: null, rect: { x: 34, y: 140, width: 11, height: 30, rx: 5 } },
  { grupo: null, rect: { x: 55, y: 140, width: 11, height: 30, rx: 5 } },
];

const PELVE_NEUTRA: Forma[] = [
  { grupo: null, rect: { x: 32, y: 82, width: 36, height: 14, rx: 6 } },
];

const FORMAS_FRENTE: Forma[] = [
  ...CABECA_PESCOCO,
  { grupo: "ombros", circle: { cx: 27, cy: 34, r: 9 } },
  { grupo: "ombros", circle: { cx: 73, cy: 34, r: 9 } },
  { grupo: "biceps", rect: { x: 14, y: 38, width: 10, height: 26, rx: 5 } },
  { grupo: "biceps", rect: { x: 76, y: 38, width: 10, height: 26, rx: 5 } },
  { grupo: "peito", rect: { x: 34, y: 32, width: 32, height: 22, rx: 6 } },
  { grupo: "core", rect: { x: 38, y: 56, width: 24, height: 26, rx: 6 } },
  ...BRACOS_NEUTROS_ANTEBRACO,
  ...PELVE_NEUTRA,
  { grupo: "quadriceps", rect: { x: 32, y: 98, width: 15, height: 40, rx: 6 } },
  { grupo: "quadriceps", rect: { x: 53, y: 98, width: 15, height: 40, rx: 6 } },
  ...PERNAS_NEUTRAS_INFERIOR_FRENTE,
];

const FORMAS_COSTAS: Forma[] = [
  ...CABECA_PESCOCO,
  { grupo: null, circle: { cx: 27, cy: 34, r: 9 } },
  { grupo: null, circle: { cx: 73, cy: 34, r: 9 } },
  { grupo: "triceps", rect: { x: 14, y: 38, width: 10, height: 26, rx: 5 } },
  { grupo: "triceps", rect: { x: 76, y: 38, width: 10, height: 26, rx: 5 } },
  { grupo: "costas", rect: { x: 30, y: 28, width: 40, height: 30, rx: 8 } },
  ...BRACOS_NEUTROS_ANTEBRACO,
  { grupo: "gluteos", rect: { x: 32, y: 82, width: 36, height: 16, rx: 8 } },
  { grupo: "posteriores", rect: { x: 32, y: 100, width: 15, height: 38, rx: 6 } },
  { grupo: "posteriores", rect: { x: 53, y: 100, width: 15, height: 38, rx: 6 } },
  { grupo: "panturrilhas", rect: { x: 34, y: 140, width: 11, height: 30, rx: 5 } },
  { grupo: "panturrilhas", rect: { x: 55, y: 140, width: 11, height: 30, rx: 5 } },
];

export function DiagramaMuscular({
  grupo,
  className,
}: {
  grupo: GrupoMuscular;
  className?: string;
}) {
  const vista = VISTA_POR_GRUPO[grupo];
  const formas = vista === "frente" ? FORMAS_FRENTE : FORMAS_COSTAS;

  return (
    <svg
      viewBox="0 0 100 180"
      aria-hidden="true"
      className={cn("h-full w-auto", className)}
    >
      {formas.map((forma, indice) => {
        const destacado = forma.grupo === grupo;
        const classe = cn(
          "stroke-border-strong",
          destacado ? "fill-on-surface-strong" : "fill-surface-container-high",
        );
        if (forma.circle) {
          return (
            <circle
              key={indice}
              cx={forma.circle.cx}
              cy={forma.circle.cy}
              r={forma.circle.r}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              className={classe}
            />
          );
        }
        if (forma.rect) {
          return (
            <rect
              key={indice}
              x={forma.rect.x}
              y={forma.rect.y}
              width={forma.rect.width}
              height={forma.rect.height}
              rx={forma.rect.rx}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              className={classe}
            />
          );
        }
        return null;
      })}
    </svg>
  );
}
