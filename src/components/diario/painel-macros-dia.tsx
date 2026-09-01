import { CORES_MACRO } from "@/components/tela/barra-macro";
import type { PainelMacros } from "@/domain/diario/tipos";
import { cn } from "@/lib/utils";

/**
 * Os três macronutrientes que o atleta acompanha.
 *
 * Fibras saíram: nenhuma decisão diante do prato mudava com aquele
 * número, e a quinta coluna espremia as outras quatro na largura de um
 * celular. Energia também não está aqui — não é macro, e misturá-la na
 * mesma grade dava a cinco grandezas o mesmo peso visual, quando uma
 * delas é a soma das outras.
 */
const MACROS_DO_PAINEL = [
  {
    chave: "proteinaG",
    sigla: "P",
    rotulo: "Proteína",
    cor: CORES_MACRO.proteina,
  },
  {
    chave: "carboidratosG",
    sigla: "C",
    rotulo: "Carboidratos",
    cor: CORES_MACRO.carboidratos,
  },
  {
    chave: "gordurasG",
    sigla: "G",
    rotulo: "Gorduras",
    cor: CORES_MACRO.gorduras,
  },
] as const;

function proporcao(consumido: number, meta: number): number {
  return meta > 0 ? Math.min(1, consumido / meta) : 0;
}

function frase(
  rotulo: string,
  consumido: number,
  meta: number,
  restante: number,
  unidade: string,
): string {
  const situacao =
    restante >= 0
      ? `restam ${restante} ${unidade}`
      : `${Math.abs(restante)} ${unidade} acima da meta`;
  return `${rotulo}: ${consumido} de ${meta} ${unidade} consumidos, ${situacao}`;
}

/**
 * Painel do dia, no padrão compacto do MacroFactor
 * (referências 139–140): `consumido / meta` com barra fina abaixo. A
 * linha do tempo é o conteúdo da tela — o painel é cabeçalho e não
 * pode empurrar as refeições para fora da dobra.
 *
 * Duas camadas, e não uma grade única: energia em cima, porque é o
 * número que mais decide o que cabe no resto do dia e é a soma dos
 * três de baixo; proteína, carboidratos e gorduras logo abaixo, em
 * colunas de peso igual entre si. Enquanto os cinco valores dividiam a
 * mesma linha, kcal e fibras disputavam a atenção com a proteína e
 * cada coluna ficava estreita demais para mostrar a meta inteira.
 *
 * Ultrapassar a meta não vira alerta vermelho, para evitar linguagem
 * punitiva. O excesso aparece como barra cheia e restante negativo,
 * que é informação, não repreensão.
 */
export function PainelMacrosDia({
  painel,
  className,
}: {
  painel: PainelMacros;
  className?: string;
}) {
  const energia = {
    consumido: painel.consumido.calorias,
    meta: painel.meta.calorias,
    restante: painel.restante.calorias,
  };

  return (
    <section
      aria-label="Macros do dia"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border bg-surface-container px-4 py-3",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-title font-bold tabular-nums text-on-surface-strong">
            {energia.consumido}
            <span className="text-body-md font-normal text-muted-foreground">
              /{energia.meta} kcal
            </span>
          </p>
          <p className="text-caption tabular-nums text-muted-foreground">
            {energia.restante >= 0
              ? `restam ${energia.restante}`
              : `${Math.abs(energia.restante)} acima`}
          </p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
          <span
            className="block h-full bg-on-surface-strong"
            style={{ width: `${proporcao(energia.consumido, energia.meta) * 100}%` }}
          />
        </div>
        <p className="sr-only">
          {frase("Energia", energia.consumido, energia.meta, energia.restante, "kcal")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {MACROS_DO_PAINEL.map((macro) => {
          const meta = painel.meta[macro.chave];
          const consumido = painel.consumido[macro.chave];
          const restante = painel.restante[macro.chave];
          return (
            // Centralizado dentro da própria coluna: alinhado à esquerda,
            // o rótulo e o par consumido/meta ficavam encostados na borda
            // de cada terço, com um vazio à direita que ligava visualmente
            // cada número à barra do macro seguinte.
            <div key={macro.chave} className="flex min-w-0 flex-col items-center gap-1">
              {/* Com três colunas o nome inteiro cabe: a sigla isolada
                  era concessão à grade de cinco que não existe mais. */}
              <p className="max-w-full truncate text-caption font-bold text-muted-foreground">
                {macro.rotulo}
              </p>
              <p className="text-caption tabular-nums text-on-surface-strong">
                <strong>{consumido}</strong>
                <span className="text-muted-foreground">/{meta} g</span>
              </p>
              <div className="h-1 w-full overflow-hidden rounded-full bg-surface-container-high">
                <span
                  className={cn("block h-full", macro.cor)}
                  style={{ width: `${proporcao(consumido, meta) * 100}%` }}
                />
              </div>
              {/* O restante fica sob o macro a que pertence, e não numa
                  frase corrida no rodapé: enquanto os três dividiam uma
                  linha separados por `·`, o espaçamento entre eles vinha
                  da largura de cada texto — "restam 190 g" e "8 g acima"
                  produzem intervalos diferentes, e nenhum coincidia com
                  as colunas logo acima. Na mesma grade, o alinhamento
                  passa a ser consequência da estrutura. */}
              <p className="max-w-full truncate text-caption tabular-nums text-muted-foreground">
                {restante >= 0
                  ? `restam ${restante} g`
                  : `${Math.abs(restante)} g acima`}
              </p>
              <p className="sr-only">
                {frase(macro.rotulo, consumido, meta, restante, "g")}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
