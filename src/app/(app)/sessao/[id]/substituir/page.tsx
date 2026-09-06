import { notFound } from "next/navigation";
import Link from "next/link";
import { Info, Repeat2, X } from "lucide-react";
import { obterSessaoAtual } from "@/auth/sessao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExplicacaoAgent } from "@/components/tela";
import { AVISO_VARIEDADE, MOTIVOS_SUBSTITUICAO, type MotivoSubstituicao } from "@/domain/plano/substituicoes";
import { alternativasParaSessao, obterSessao } from "@/domain/sessao/repositorio";
import { substituirExercicioAction } from "../../actions";

function motivoValido(valor: string | undefined): valor is MotivoSubstituicao {
  return MOTIVOS_SUBSTITUICAO.some((motivo) => motivo.id === valor);
}

export default async function SubstituirPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ exercicio?: string; motivo?: string; relato?: string }>;
}) {
  const { id } = await params;
  const { exercicio: exercicioId, motivo: motivoParam, relato } = await searchParams;
  const session = await obterSessaoAtual();
  const userId = session?.user?.id;
  if (!userId) notFound();

  const sessao = await obterSessao(userId, id);
  if (!sessao || !exercicioId) notFound();
  const exercicio = sessao.exercicios.find((item) => item.exercicioId === exercicioId);
  if (!exercicio) notFound();

  const motivo = motivoValido(motivoParam) ? motivoParam : null;
  const alternativas = motivo
    ? await alternativasParaSessao(userId, id, { exercicioId, motivo, relatoDor: relato })
    : [];
  const voltar = `/sessao/${sessao.id}?exercicio=${sessao.exercicios.indexOf(exercicio)}`;

  return (
    <div className="flex flex-col gap-5 p-4 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-label-md text-muted-foreground">SUBSTITUIR</p>
          <h1 className="text-headline-md font-bold">{exercicio.nome}</h1>
        </div>
        <Button asChild variant="ghost" size="icon"><Link href={voltar} aria-label="Fechar substituição"><X /></Link></Button>
      </header>

      <p className="flex gap-3 rounded-xl border border-border bg-surface-container p-4 text-body-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        {AVISO_VARIEDADE}
      </p>

      {/* Antes de trocar, o motivo pelo qual este exercício foi
          escolhido para este atleta — e não a justificativa genérica de
          catálogo, que aparece nas alternativas. Trocar um exercício
          prescrito por causa de uma lesão é decisão diferente de trocar
          um exercício qualquer. */}
      {exercicio.explicacao ? (
        <div className="rounded-xl border border-border bg-surface-container p-4">
          <ExplicacaoAgent
            pergunta="Por que este exercício foi escolhido?"
            explicacao={exercicio.explicacao}
          />
        </div>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-label-md tracking-wide text-muted-foreground uppercase">Por que trocar?</h2>
        {MOTIVOS_SUBSTITUICAO.map((opcao) => (
          <Link
            key={opcao.id}
            href={`/sessao/${sessao.id}/substituir?exercicio=${exercicioId}&motivo=${opcao.id}`}
            aria-current={motivo === opcao.id ? "true" : undefined}
            className={`rounded-xl border p-4 ${motivo === opcao.id ? "border-on-surface-strong bg-surface-container-high" : "border-border bg-surface-container"}`}
          >
            <strong className="text-label-lg">{opcao.rotulo}</strong>
            <p className="text-body-sm text-muted-foreground">{opcao.descricao}</p>
            {opcao.persistente ? <Badge variant="secondary" className="mt-2">Vale para as próximas sessões</Badge> : null}
          </Link>
        ))}
      </section>

      {motivo === "dor" ? (
        <form action={`/sessao/${sessao.id}/substituir`} className="flex flex-col gap-2 rounded-xl border border-border bg-surface-container p-4">
          <input type="hidden" name="exercicio" value={exercicioId} />
          <input type="hidden" name="motivo" value="dor" />
          <label htmlFor="relato" className="text-label-md text-muted-foreground">Onde dói?</label>
          <input id="relato" name="relato" defaultValue={relato ?? ""} placeholder="Ex.: ombro direito"
            className="h-12 rounded-lg border border-input bg-surface-container-high px-3" />
          <Button size="lg" variant="secondary">Filtrar sugestões</Button>
        </form>
      ) : null}

      {motivo ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-label-md tracking-wide text-muted-foreground uppercase">Melhores correspondências</h2>
          {alternativas.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface-container p-4 text-body-sm text-muted-foreground">
              Nenhuma alternativa segura para este motivo com o equipamento do seu perfil. Pule o exercício e relate na conclusão da sessão.
            </p>
          ) : null}
          {alternativas.map((alternativa) => (
            <form key={alternativa.exercicioId} action={substituirExercicioAction.bind(null, sessao.id)}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-container p-4">
              <input type="hidden" name="exercicioId" value={exercicioId} />
              <input type="hidden" name="novoExercicioId" value={alternativa.exercicioId} />
              <input type="hidden" name="motivo" value={motivo} />
              <input type="hidden" name="observacao" value={relato ?? ""} />
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-high"><Repeat2 className="size-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <strong className="text-label-lg">{alternativa.nome}</strong>
                  {alternativa.preservaEstimulo
                    ? <Badge variant="secondary">Mesmo estímulo</Badge>
                    : <Badge variant="outline">Estímulo aproximado</Badge>}
                </div>
                <p className="text-body-sm text-muted-foreground">{alternativa.justificativa}</p>
              </div>
              <Button size="sm" aria-label={`Substituir por ${alternativa.nome}`}>Trocar</Button>
            </form>
          ))}
        </section>
      ) : null}
    </div>
  );
}
