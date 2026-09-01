import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { obterMedidasDaAvaliacaoInicial } from "@/domain/medicoes/repositorio";
import { salvarMedidasCompletas } from "../actions";
import { CampoMedida } from "../_components/campo-medida";

/**
 * Proporções e simetria usam uma medida por região. Lados direito e
 * esquerdo ficam lado a lado porque a comparação bilateral depende
 * dessa proximidade.
 */

/**
 * Mesmo padrão da tela essencial: `onde` dá a referência anatômica e
 * `como` a postura. Nos pares bilaterais, a postura importa ainda mais
 * — medir um lado contraído e o outro relaxado inventa assimetria.
 */
const GRUPOS = [
  {
    titulo: "Tórax",
    onde: "Passe a fita ao redor do peito, na linha dos mamilos e por baixo das axilas.",
    como: "Em pé, braços soltos ao lado do corpo. Mantenha a fita horizontal e meça ao final de uma expiração normal, sem estufar o peito.",
    campos: [{ id: "torax", rotulo: "Tórax", chave: "torax:unico" }],
  },
  {
    titulo: "Ombros",
    onde: "Meça a volta completa ao redor dos dois ombros — não a distância de ponta a ponta. A fita passa pela parte mais saliente de cada ombro, pela parte alta do peito e das costas.",
    como: "Peça ajuda a outra pessoa. Em pé, deixe os braços soltos ao lado do corpo. Quem mede mantém a fita horizontal, rente à pele e sem apertar.",
    campos: [{ id: "ombros", rotulo: "Ombros", chave: "ombros:unico" }],
  },
  {
    titulo: "Braços",
    onde: "Na metade entre o ombro e o cotovelo, no ponto de maior volume.",
    como: "Braço solto ao lado do corpo e músculo relaxado. Meça os dois lados do mesmo jeito — contrair um só cria uma assimetria que não existe.",
    campos: [
      { id: "bracoD", rotulo: "Direito", chave: "braco:direito" },
      { id: "bracoE", rotulo: "Esquerdo", chave: "braco:esquerdo" },
    ],
  },
  {
    titulo: "Coxas",
    onde: "Logo abaixo da dobra do glúteo, na parte mais grossa.",
    como: "Em pé, pés levemente afastados e peso igual nos dois lados, sem contrair.",
    campos: [
      { id: "coxaD", rotulo: "Direita", chave: "coxa:direito" },
      { id: "coxaE", rotulo: "Esquerda", chave: "coxa:esquerdo" },
    ],
  },
  {
    titulo: "Panturrilhas",
    onde: "Na parte mais grossa, entre o joelho e o tornozelo.",
    como: "Em pé, peso igual nos dois pés e calcanhares no chão.",
    campos: [
      { id: "panturrilhaD", rotulo: "Direita", chave: "panturrilha:direito" },
      { id: "panturrilhaE", rotulo: "Esquerda", chave: "panturrilha:esquerdo" },
    ],
  },
  {
    titulo: "Punho",
    onde: "Passe a fita ao redor da parte mais fina do punho, no vinco onde a mão encontra o braço. A fita fica entre a mão e os dois ossinhos salientes do punho — não passe sobre os ossos.",
    como: "Deixe a mão aberta e relaxada, com a palma para cima. Mantenha a fita reta ao redor do punho, encostada na pele e sem apertar.",
    campos: [{ id: "punho", rotulo: "Punho", chave: "punho:unico" }],
  },
  {
    titulo: "Tornozelo",
    onde: "Passe a fita ao redor da parte mais fina da perna, logo acima dos dois ossos salientes do tornozelo, na direção do joelho. Não meça sobre os ossos nem sobre o pé.",
    como: "Sente-se com o pé inteiro apoiado no chão e relaxado. Mantenha a fita horizontal, encostada na pele e sem apertar.",
    campos: [{ id: "tornozelo", rotulo: "Tornozelo", chave: "tornozelo:unico" }],
  },
] as const;

export default async function CompletasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/");

  const parametros = await searchParams;
  const { erro } = parametros;
  const comFalha = new Set((parametros.falhas ?? "").split(",").filter(Boolean));

  // Voltar à etapa deve reencontrar o que já foi medido; a query string
  // vence porque carrega a correção ainda não persistida.
  const salvas = await obterMedidasDaAvaliacaoInicial(userId);

  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-6 py-8">
      <Link
        href="/triagem/avaliacao-corporal/essenciais"
        aria-label="Voltar"
        className="-ml-3 flex size-11 items-center justify-center rounded-full text-on-surface-strong transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="size-8" aria-hidden="true" />
      </Link>

      <header className="flex flex-col gap-2">
        <p className="text-label-md font-semibold tracking-wide text-muted-foreground uppercase">
          Conjunto completo
        </p>
        <h1 className="text-headline-md font-bold text-on-surface-strong">
          Proporções e simetria
        </h1>
        <p className="text-body-md leading-relaxed text-muted-foreground">
          Opcional. Preencha as regiões que medir agora — o que ficar em branco
          pode ser registrado depois.
        </p>
      </header>

      {erro ? (
        <p
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-error/40 bg-surface-container px-4 py-3 text-body-sm text-error"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {erro}
        </p>
      ) : null}

      <form action={salvarMedidasCompletas} className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-3">
          {GRUPOS.map(({ titulo, onde, como, campos }) => (
            <fieldset
              key={titulo}
              className="overflow-hidden rounded-2xl border border-border bg-surface-container"
            >
              <legend className="sr-only">{titulo}</legend>
              <div className="flex flex-col gap-1.5 px-5 pt-4 pb-3">
                <strong className="text-title text-on-surface-strong">
                  {titulo}
                </strong>
                <span className="text-body-sm leading-relaxed text-on-surface">
                  {onde}
                </span>
                <span className="text-body-sm leading-relaxed text-muted-foreground">
                  {como}
                </span>
              </div>
              <div className={`grid gap-px border-t border-border bg-border ${campos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {campos.map(({ id, rotulo, chave }) => (
                  <label
                    key={id}
                    className="flex flex-col gap-1.5 bg-background px-4 py-3"
                  >
                    <span className="text-body-sm text-muted-foreground">
                      {rotulo}
                    </span>
                    <span className="flex items-baseline gap-1.5">
                      <CampoMedida
                        prefixo={id}
                        valorInicial={parametros[id] ?? salvas.get(chave) ?? ""}
                        invalido={comFalha.has(id)}
                        rotuloAcessivel={rotulo === "Direito" || rotulo === "Direita" || rotulo === "Esquerdo" || rotulo === "Esquerda" ? `${titulo}, ${rotulo}` : rotulo}
                        className="h-12 flex-1 rounded-lg bg-surface-container text-center text-title tabular-nums"
                      />
                      <span className="text-body-sm text-muted-foreground">
                        cm
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <p className="rounded-xl bg-surface-container px-4 py-3 text-body-sm text-muted-foreground">
            Cada medida é guardada assim que você sai do campo. Diferenças
            entre lados permanecem como incerteza até se confirmarem com
            repetição, fotos ou desempenho.
          </p>
          <Button size="lg" type="submit" className="h-12 w-full">
            Salvar o que medi
          </Button>
          <Button asChild variant="ghost" className="h-12 w-full">
            <Link href="/triagem/avaliacao-corporal/gordura">
              Concluir depois
            </Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
