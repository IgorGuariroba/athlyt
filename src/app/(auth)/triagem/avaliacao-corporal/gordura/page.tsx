import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ChevronDown, ChevronLeft, Info } from "lucide-react";
import { obterSessaoAtual } from "@/auth/sessao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  METODOS_GORDURA,
  metodoGorduraValido,
} from "@/domain/medicoes/catalogo-gordura";
import { obterGorduraDaAvaliacaoInicial } from "@/domain/medicoes/repositorio";
import { salvarGordura } from "../actions";

export default async function GorduraPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await obterSessaoAtual();
  const userId = session?.user?.id;
  if (!userId) redirect("/");

  const parametros = await searchParams;
  const salva = await obterGorduraDaAvaliacaoInicial(userId);
  const percentual =
    parametros.percentual ??
    (salva ? (salva.percentualBasisPoints / 100).toString() : "");
  const metodoBruto = parametros.metodo ?? salva?.metodo ?? "";
  const metodo = metodoGorduraValido(metodoBruto) ? metodoBruto : "";
  const protocolo = parametros.protocolo ?? salva?.protocolo ?? "";
  const equipamento = parametros.equipamento ?? salva?.equipamento ?? "";
  const profissional = parametros.profissional ?? salva?.profissional ?? "";
  const temDetalhes = Boolean(protocolo || equipamento || profissional);

  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-6 py-8">
      <Link
        href="/triagem/avaliacao-corporal/completas"
        aria-label="Voltar"
        className="-ml-3 flex size-11 items-center justify-center rounded-full text-on-surface-strong transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="size-8" aria-hidden="true" />
      </Link>

      <header className="flex flex-col gap-2">
        <p className="text-label-md uppercase tracking-wide text-muted-foreground">
          Opcional
        </p>
        <h1 className="text-headline-md font-bold text-on-surface-strong">
          Gordura corporal
        </h1>
        <p className="text-body-md leading-relaxed text-muted-foreground">
          Registre um valor fornecido por exame, aparelho ou protocolo. Se não
          tiver uma medição, siga sem preencher.
        </p>
      </header>

      {parametros.erro ? (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-body-sm text-error"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{parametros.erro}</span>
        </div>
      ) : null}

      <form action={salvarGordura} className="flex flex-1 flex-col gap-6">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface-container">
          <div className="flex flex-col gap-1.5 px-5 pt-4 pb-3">
            <label
              htmlFor="percentual"
              className="text-title text-on-surface-strong"
            >
              Percentual medido
            </label>
            <p className="text-body-sm text-muted-foreground">
              Digite o número exibido no laudo ou equipamento.
            </p>
          </div>
          <div className="border-t border-border bg-background px-5 py-4">
            <div className="relative">
              <Input
                id="percentual"
                name="percentual"
                type="number"
                inputMode="decimal"
                min="2"
                max="70"
                step="0.1"
                required
                placeholder="—"
                defaultValue={percentual}
                aria-invalid={parametros.erro ? true : undefined}
                className="h-16 rounded-xl bg-surface-container pr-14 text-center text-headline-lg font-bold tabular-nums"
              />
              <span className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-title text-muted-foreground">
                %
              </span>
            </div>
          </div>
        </section>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-title text-on-surface-strong">
            Como foi medido?
          </legend>
          <p className="text-body-sm text-muted-foreground">
            O método fica registrado porque resultados de métodos diferentes
            não são diretamente comparáveis.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {METODOS_GORDURA.map((opcao) => (
              <label key={opcao.id} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="metodo"
                  value={opcao.id}
                  required
                  defaultChecked={metodo === opcao.id}
                  className="peer sr-only"
                />
                <span className="flex min-h-20 flex-col justify-center rounded-xl border border-border bg-surface-container px-3 py-3 transition-colors peer-checked:border-on-surface-strong peer-checked:bg-surface-container-high peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                  <strong className="text-label-lg text-on-surface-strong">
                    {opcao.rotulo}
                  </strong>
                  <span className="text-body-sm leading-snug text-muted-foreground">
                    {opcao.descricao}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <details
          open={temDetalhes || Boolean(parametros.erro)}
          className="group overflow-hidden rounded-2xl border border-border bg-surface-container"
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 text-label-lg text-on-surface-strong [&::-webkit-details-marker]:hidden">
            Detalhes da medição
            <span className="flex items-center gap-2 text-body-sm font-normal text-muted-foreground">
              Opcional
              <ChevronDown
                className="size-4 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </span>
          </summary>
          <div className="flex flex-col gap-4 border-t border-border bg-background px-4 py-4">
            <label className="flex flex-col gap-1.5 text-label-md text-on-surface">
              Protocolo ou condições
              <Input
                name="protocolo"
                defaultValue={protocolo}
                placeholder="Ex.: jejum, protocolo Jackson-Pollock"
                className="h-12 rounded-lg bg-surface-container"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-label-md text-on-surface">
              Equipamento
              <Input
                name="equipamento"
                defaultValue={equipamento}
                placeholder="Ex.: balança InBody 270"
                className="h-12 rounded-lg bg-surface-container"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-label-md text-on-surface">
              Profissional responsável
              <Input
                name="profissional"
                defaultValue={profissional}
                placeholder="Nome ou clínica"
                className="h-12 rounded-lg bg-surface-container"
              />
            </label>
          </div>
        </details>

        <div className="flex gap-3 rounded-xl bg-surface-container px-4 py-3 text-body-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
          <p>
            Para acompanhar evolução, tente repetir o mesmo método em condições
            parecidas. Não buscamos precisão perfeita em uma única leitura.
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <Button size="lg" type="submit" className="h-12 w-full">
            Salvar e continuar
          </Button>
          <Button asChild variant="ghost" className="h-12 w-full">
            <Link href="/triagem/avaliacao-corporal/fotos">
              Não tenho uma medição
            </Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
