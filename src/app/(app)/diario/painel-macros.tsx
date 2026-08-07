import { CORES_MACRO } from "@/components/tela";
import type { PainelMacros } from "@/domain/diario/tipos";

const MACROS = [
  { chave: "calorias", sigla: "E", rotulo: "Energia", unidade: "kcal", cor: "bg-on-surface-strong" },
  { chave: "proteinaG", sigla: "P", rotulo: "Proteína", unidade: "g", cor: CORES_MACRO.proteina },
  { chave: "carboidratosG", sigla: "C", rotulo: "Carboidratos", unidade: "g", cor: CORES_MACRO.carboidratos },
  { chave: "gordurasG", sigla: "G", rotulo: "Gorduras", unidade: "g", cor: CORES_MACRO.gorduras },
  { chave: "fibrasG", sigla: "F", rotulo: "Fibras", unidade: "g", cor: CORES_MACRO.fibras },
] as const;

/**
 * Painel de macros do dia (tela 045), no padrão compacto do
 * MacroFactor (referências 139–140): uma faixa horizontal
 * `consumido / meta` por macro, com barra fina abaixo. A linha do
 * tempo é o conteúdo da tela — o painel é cabeçalho e não pode
 * empurrar as refeições para fora da dobra, como aconteceria com uma
 * linha de texto por macro.
 *
 * O restante, exigido pela spec, vai numa única linha de resumo em vez
 * de cinco: o número que muda a decisão do atleta é quase sempre a
 * energia, e os demais cabem na mesma frase.
 *
 * Ultrapassar a meta não vira alerta vermelho: a spec proíbe
 * linguagem punitiva. O excesso aparece como barra cheia e restante
 * negativo, que é informação, não repreensão.
 */
export function PainelDeMacros({ painel }: { painel: PainelMacros }) {
  return (
    <section
      aria-label="Macros do dia"
      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-container px-4 py-3"
    >
      <div className="grid grid-cols-5 gap-3">
      {MACROS.map((macro) => {
        const meta = painel.meta[macro.chave];
        const consumido = painel.consumido[macro.chave];
        const restante = painel.restante[macro.chave];
        const proporcao = meta > 0 ? Math.min(1, consumido / meta) : 0;
        return (
          <div key={macro.chave} className="flex min-w-0 flex-col gap-1">
            {/* Sigla acima do par consumido/meta: com cinco macros na
                largura de um celular, a linha única truncava justamente
                a meta — o número de referência. */}
            <p className="text-caption font-bold text-muted-foreground">{macro.sigla}</p>
            <p className="text-caption tabular-nums text-on-surface-strong">
              <strong>{consumido}</strong>
              <span className="text-muted-foreground">/{meta}</span>
            </p>
            <div className="h-1 overflow-hidden rounded-full bg-surface-container-high">
              <span
                className={`block h-full ${macro.cor}`}
                style={{ width: `${proporcao * 100}%` }}
              />
            </div>
            {/* Texto completo fica acessível a leitores de tela sem
                ocupar a dobra: a sigla sozinha não é rótulo suficiente. */}
            <p className="sr-only">
              {macro.rotulo}: {consumido} de {meta} {macro.unidade} consumidos,{" "}
              {restante >= 0
                ? `restam ${restante} ${macro.unidade}`
                : `${Math.abs(restante)} ${macro.unidade} acima da meta`}
            </p>
          </div>
        );
      })}
      </div>
      <p className="text-caption tabular-nums text-muted-foreground">
        {MACROS.map((macro) => {
          const restante = painel.restante[macro.chave];
          return restante >= 0
            ? `${macro.sigla} restam ${restante} ${macro.unidade}`
            : `${macro.sigla} ${Math.abs(restante)} ${macro.unidade} acima`;
        }).join(" · ")}
      </p>
    </section>
  );
}
