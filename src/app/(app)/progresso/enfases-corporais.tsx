import { Button } from "@/components/ui/button";
import { CartaoLista, ChipSelecao } from "@/components/tela";

const REGIOES = [
  { valor: "ombros", rotulo: "Ombros" },
  { valor: "braco", rotulo: "Braços" },
  { valor: "torax", rotulo: "Tórax" },
  { valor: "coxa", rotulo: "Coxas" },
  { valor: "panturrilha", rotulo: "Panturrilhas" },
] as const;

/**
 * Preferência de ênfase por região: entrada do usuário para
 * o recálculo das Metas de Proporção Corporal.
 *
 * Fica em um cartão próprio, e não dentro da lista de metas, porque é
 * ação e não dado. A hierarquia espacial apresenta primeiro os dados e
 * depois os controles.
 */
export function EnfasesCorporais({
  action,
  selecionadas = [],
}: {
  action: (fd: FormData) => Promise<void>;
  selecionadas?: readonly string[];
}) {
  return (
    <CartaoLista aria-labelledby="enfases-titulo">
      <form action={action} className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <h3
            id="enfases-titulo"
            className="text-label-lg text-on-surface-strong"
          >
            Preferências de ênfase
          </h3>
          <p className="text-body-sm leading-relaxed text-muted-foreground">
            A preferência gera uma proposta conservadora; saúde e recuperação
            continuam prevalecendo sobre a estética.
          </p>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Regiões a enfatizar</legend>
          <div className="flex flex-wrap gap-2">
            {REGIOES.map((regiao) => (
              <ChipSelecao
                key={regiao.valor}
                id={`enfase-${regiao.valor}`}
                name="enfases"
                value={regiao.valor}
                rotulo={regiao.rotulo}
                defaultChecked={selecionadas.includes(regiao.valor)}
              />
            ))}
          </div>
        </fieldset>

        <Button type="submit" variant="secondary" size="cta">
          Recalcular metas
        </Button>
      </form>
    </CartaoLista>
  );
}
