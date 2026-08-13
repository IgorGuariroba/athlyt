import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CabecalhoSecao,
  CabecalhoTela,
  EstadoVazio,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { listarConflitosPendentes } from "@/domain/sessao/sincronizacao";
import { resolverConflitoAction } from "./actions";
import { FilaLocal } from "./fila-local";

/**
 * Tela 085 — Sincronização e conflitos.
 *
 * Duas metades com donos diferentes: a fila pendente só existe no
 * dispositivo (por isso é um componente cliente), e os conflitos já
 * estão materializados no servidor aguardando decisão humana. Nenhuma
 * das duas some sozinha — é o que garante que nada seja descartado
 * silenciosamente.
 */
const ROTULO_MOTIVO: Record<string, string> = {
  serie_divergente: "A mesma série foi registrada com valores diferentes",
  sessao_ja_encerrada: "A sessão já havia sido encerrada de outra forma",
};

function Valores({ dados }: { dados: Record<string, unknown> }) {
  const entradas = Object.entries(dados).filter(([chave]) => !["exercicioId", "numero"].includes(chave));
  return (
    <dl className="flex flex-col gap-1 text-body-sm">
      {entradas.map(([chave, valor]) => (
        <div key={chave} className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{chave}</dt>
          <dd className="font-semibold tabular-nums">{String(valor)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function SincronizacaoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const conflitos = await listarConflitosPendentes(session.user.id);

  return (
    <TelaConteudo>
      <CabecalhoTela
        titulo="Sincronização"
        voltar={{ href: "/mais", rotulo: "Voltar para Mais" }}
      />

      <SecoesTela>
        <FilaLocal />

      <section className="flex flex-col gap-3">
        <CabecalhoSecao titulo={`Conflitos (${conflitos.length})`} />
        {conflitos.length === 0 ? (
          <EstadoVazio
            Icone={CheckCircle2}
            titulo="Nenhum conflito"
            descricao="Quando o mesmo registro divergir entre servidor e aparelho, a decisão aparece aqui."
          />
        ) : conflitos.map((conflito) => (
          <Card key={conflito.id} className="flex flex-col gap-3 p-4">
            <div>
              <p className="text-label-lg font-semibold">{ROTULO_MOTIVO[conflito.motivo] ?? conflito.motivo}</p>
              <p className="text-body-sm text-muted-foreground">
                {typeof conflito.dispositivo.exercicioId === "string"
                  ? `${conflito.dispositivo.exercicioId} · série ${conflito.dispositivo.numero}`
                  : `Sessão ${conflito.sessionId.slice(0, 8)}`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-surface-container p-3">
                <p className="mb-2 text-caption font-semibold tracking-wide text-muted-foreground uppercase">No servidor</p>
                <Valores dados={conflito.servidor} />
              </div>
              <div className="rounded-lg border border-border bg-surface-container p-3">
                <p className="mb-2 text-caption font-semibold tracking-wide text-muted-foreground uppercase">Neste aparelho</p>
                <Valores dados={conflito.dispositivo} />
              </div>
            </div>
            <div className="flex gap-2">
              <form action={resolverConflitoAction.bind(null, conflito.id, "servidor")} className="flex-1">
                <Button type="submit" variant="secondary" className="w-full">Manter o do servidor</Button>
              </form>
              <form action={resolverConflitoAction.bind(null, conflito.id, "dispositivo")} className="flex-1">
                <Button type="submit" className="w-full">Usar o deste aparelho</Button>
              </form>
            </div>
          </Card>
        ))}
      </section>
      </SecoesTela>
    </TelaConteudo>
  );
}
