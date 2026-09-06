import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { obterSessaoAtual } from "@/auth/sessao";
import { Button } from "@/components/ui/button";
import { obterMedidasDaAvaliacaoInicial } from "@/domain/medicoes/repositorio";
import { salvarMedidasEssenciais } from "../actions";
import { CampoMedida } from "../_components/campo-medida";

/**
 * As medidas essenciais usam uma medida por região. O que garante a
 * comparação ao longo do tempo é a instrução anatômica — mesmo ponto,
 * mesma postura, mesma tensão de fita — e não repetir a leitura no
 * mesmo dia.
 */

/**
 * `onde` usa referência óssea palpável, e não o contorno do corpo:
 * "ponto mais estreito" não existe em quem tem mais gordura abdominal,
 * e o umbigo migra conforme a postura. A menção ao umbigo serve só
 * como conferência do resultado, nunca como o ponto a medir.
 */
const REGIOES = [
  {
    id: "cintura",
    rotulo: "Cintura",
    onde: "Ache com os dedos a última costela e o osso do quadril. Meça na metade da distância entre os dois — costuma cair um pouco acima do umbigo.",
    como: "Em pé, barriga relaxada, braços ao lado do corpo. Solte o ar e meça antes de puxar de novo, sem prender a respiração nem contrair.",
  },
  {
    id: "pescoco",
    rotulo: "Pescoço",
    onde: "Logo abaixo do pomo de adão, no ponto mais fino.",
    como: "Olhando para a frente, ombros relaxados. A fita fica levemente inclinada para baixo na frente e não deve apertar.",
  },
  {
    id: "quadril",
    rotulo: "Quadril",
    onde: "Na parte mais larga dos glúteos, vista de lado.",
    como: "Em pé, pés juntos e peso igual nos dois lados. Glúteos relaxados, sem contrair.",
  },
] as const;

export default async function EssenciaisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await obterSessaoAtual();
  const userId = session?.user?.id;
  if (!userId) redirect("/");

  const parametros = await searchParams;
  const { erro } = parametros;
  const comFalha = new Set((parametros.falhas ?? "").split(",").filter(Boolean));

  // Voltar à etapa deve reencontrar o que já foi medido. O valor da
  // query string vence o do banco: ele carrega a correção em curso
  // depois de um erro, que ainda não foi persistida.
  const salvas = await obterMedidasDaAvaliacaoInicial(userId);
  const valorDe = (id: string) => parametros[id] ?? salvas.get(`${id}:unico`) ?? "";

  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-6 py-8">
      <Link
        href="/triagem/avaliacao-corporal"
        aria-label="Voltar"
        className="-ml-3 flex size-11 items-center justify-center rounded-full text-on-surface-strong transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="size-8" aria-hidden="true" />
      </Link>

      <header className="flex flex-col gap-2">
        <p className="text-label-md font-semibold tracking-wide text-muted-foreground uppercase">
          Medidas essenciais
        </p>
        <h1 className="text-headline-md font-bold text-on-surface-strong">
          Meça três regiões
        </h1>
        <p className="text-body-md leading-relaxed text-muted-foreground">
          Fita rente à pele e paralela ao chão, sem apertar. O que torna a
          comparação confiável é achar o mesmo ponto nas próximas medições.
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

      <form
        action={salvarMedidasEssenciais}
        className="flex flex-1 flex-col gap-6"
      >
        <div className="flex flex-col gap-3">
          {REGIOES.map(({ id, rotulo, onde, como }) => {
            const falhou = comFalha.has(id);

            return (
              <div
                key={id}
                className={`overflow-hidden rounded-2xl border bg-surface-container ${falhou ? "border-error/50" : "border-border"}`}
              >
                <div className="flex flex-col gap-1.5 px-5 pt-4 pb-3">
                  <label
                    htmlFor={`medida-${id}`}
                    className="text-title text-on-surface-strong"
                  >
                    {rotulo}
                  </label>
                  <span className="text-body-sm leading-relaxed text-on-surface">
                    {onde}
                  </span>
                  <span className="text-body-sm leading-relaxed text-muted-foreground">
                    {como}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border bg-background px-5 py-3">
                  <span className="text-body-sm text-muted-foreground">
                    Medida
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    <CampoMedida
                      id={`medida-${id}`}
                      prefixo={id}
                      valorInicial={valorDe(id)}
                      invalido={falhou}
                      className="h-12 w-24 rounded-lg bg-surface-container text-center text-title tabular-nums"
                    />
                    <span className="text-body-sm text-muted-foreground">cm</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <p className="rounded-xl bg-surface-container px-4 py-3 text-body-sm text-muted-foreground">
            Cada medida é guardada assim que você sai do campo — dá para
            pausar e voltar depois. Meça de manhã, antes de comer, para que as
            próximas medições sejam comparáveis.
          </p>
          <Button size="lg" type="submit" className="h-12 w-full">
            Salvar e continuar
          </Button>
        </div>
      </form>
    </main>
  );
}
