import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FUSO_PADRAO } from "@/domain/diario/dia-alimentar";
import { hojeDoUsuario, obterEntradaPlanejada } from "@/domain/diario/repositorio";
import { confirmarRefeicaoEditadaAction } from "../../actions";

/**
 * Tela 048 — editar a refeição antes de confirmar.
 *
 * A porção por item é o ajuste mais frequente ("comi metade do
 * arroz"), e 0 remove o item. A base de alimentos e os Atalhos de
 * Registro, que permitem *adicionar* itens fora do plano, chegam no
 * ticket dos Atalhos de Registro (#23).
 */
export default async function EditarRefeicaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ refeicaoRef: string }>;
  searchParams: Promise<{ dia?: string }>;
}) {
  const { refeicaoRef } = await params;
  const { dia: diaParam } = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;
  const ref = decodeURIComponent(refeicaoRef);
  const planejada = userId ? await obterEntradaPlanejada(userId, ref) : null;
  if (!planejada) notFound();
  const fuso = FUSO_PADRAO;
  const dia = diaParam ?? hojeDoUsuario(fuso);

  return (
    <form action={confirmarRefeicaoEditadaAction} className="flex min-h-full flex-col gap-6 p-4 pb-28">
      <input type="hidden" name="dia" value={dia} />
      <input type="hidden" name="fuso" value={fuso} />
      <input type="hidden" name="refeicaoRef" value={ref} />

      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/diario?dia=${dia}`} aria-label="Voltar">
            <ArrowLeft />
          </Link>
        </Button>
        <p className="text-label-md font-semibold tracking-wider text-muted-foreground uppercase">
          Editar refeição
        </p>
        <span className="size-10" />
      </header>

      <section>
        <h1 className="text-headline-sm font-bold text-on-surface-strong">{planejada.nome}</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Ajuste as porções para registrar o que você realmente comeu. Planejado:{" "}
          {planejada.macros.calorias} kcal.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface-container">
        {planejada.itens.map((item, indice) => (
          <div
            key={item.descricao}
            className="flex items-center gap-4 border-b border-border p-4 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-title font-bold text-on-surface-strong">
                {item.descricao}
              </p>
              <p className="text-body-sm tabular-nums text-muted-foreground">
                {item.calorias} kcal · P {item.proteinaG} g planejados
              </p>
            </div>
            {/* O nome do alimento fica só no rótulo acessível: repetido
                ao lado do campo, ele espremia o próprio controle. */}
            <label className="shrink-0 text-center text-caption text-muted-foreground">
              Porção
              <Input
                aria-label={`Porção de ${item.descricao}`}
                name={`porcao-${indice}`}
                type="number"
                inputMode="decimal"
                step="0.25"
                min="0"
                defaultValue={1}
                className="mt-1 h-12 w-20 text-center text-lg font-bold tabular-nums"
              />
            </label>
          </div>
        ))}
      </section>

      <p className="rounded-xl bg-surface-container p-4 text-body-sm text-muted-foreground">
        Use 0 para um item que você não comeu e 0,5 para meia porção. O consumo registrado é o
        real; o planejado fica guardado apenas como referência.
      </p>

      <Button type="submit" size="lg" className="sticky bottom-20 mt-auto h-16 w-full text-base font-bold">
        <Check className="size-5" aria-hidden="true" /> Confirmar consumo real
      </Button>
    </form>
  );
}
