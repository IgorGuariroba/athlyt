import Link from "next/link";
import { Camera, Check, Dumbbell, Pencil, Sparkles, UtensilsCrossed } from "lucide-react";

import { ExplicacaoAgent } from "@/components/tela/explicacao-agent";
import { Button } from "@/components/ui/button";
import type { ExplicacaoDecisao } from "@/domain/plano/tipos";
import type { ItemAlimentar, Macros } from "@/domain/diario/tipos";
import { cn } from "@/lib/utils";

/**
 * Cartões da linha do tempo do Diário (telas 045–048).
 *
 * Os três estados do dia — sessão de treino, refeição planejada e
 * consumo confirmado — compartilham a mesma caixa e diferem só na
 * moldura, e essa diferença é semântica: tracejada enquanto é
 * prescrição, sólida com borda de sucesso quando virou consumo real.
 * Prescrição não pode se parecer com consumo, e consumo estimado por
 * foto não pode se parecer com medido (user story 59) — decisões que,
 * escritas em classes soltas na página, divergiam a cada tela nova.
 *
 * As ações entram por slot (`acoes`): a página é quem conhece as
 * server actions, o cartão é quem conhece a forma.
 */

function macrosEmLinha(macros: Macros): string {
  return `${macros.calorias} kcal · ${macros.proteinaG}P · ${macros.carboidratosG}C · ${macros.gordurasG}G`;
}

export function CartaoSessaoDiario({
  nome,
  estado,
  href,
}: {
  nome: string;
  estado: "em_andamento" | "concluida" | "abandonada";
  href: string;
}) {
  const descricao =
    estado === "concluida"
      ? "Sessão de Treino concluída"
      : estado === "em_andamento"
        ? "Sessão de Treino em andamento"
        : "Sessão de Treino encerrada antes do fim";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-container p-4">
      <Dumbbell className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-title font-bold text-on-surface-strong">{nome}</p>
        <p className="text-body-sm text-muted-foreground">{descricao}</p>
      </div>
      <Button asChild variant="ghost" size="sm">
        <Link href={href}>Ver</Link>
      </Button>
    </div>
  );
}

export function CartaoConsumo({
  nome,
  macros,
  planejado,
  estimadoPorFoto = false,
  acoes,
}: {
  nome: string;
  macros: Macros;
  /** Snapshot da prescrição, quando o consumo veio de uma refeição planejada. */
  planejado?: Macros | null;
  estimadoPorFoto?: boolean;
  acoes?: React.ReactNode;
}) {
  const delta = planejado ? macros.calorias - planejado.calorias : 0;

  return (
    <div className="rounded-xl border border-success/40 bg-surface-container p-4">
      <div className="flex items-start gap-3">
        <Check className="mt-1 size-5 shrink-0 text-success" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-title font-bold text-on-surface-strong">{nome}</p>
          {estimadoPorFoto ? (
            <p className="flex items-center gap-1 text-caption text-muted-foreground">
              <Sparkles className="size-3" aria-hidden="true" /> Estimado por foto
            </p>
          ) : null}
          <p className="text-body-sm tabular-nums text-muted-foreground">
            {macrosEmLinha(macros)}
          </p>
          {planejado && delta !== 0 ? (
            // Desvio é informação, não repreensão (tela 048).
            <p className="mt-1 text-caption text-muted-foreground">
              {delta > 0
                ? `${delta} kcal a mais que`
                : `${Math.abs(delta)} kcal a menos que`}{" "}
              o planejado ({planejado.calorias} kcal)
            </p>
          ) : null}
        </div>
      </div>
      {acoes ? <div className="mt-3 flex justify-end">{acoes}</div> : null}
    </div>
  );
}

export function CartaoRefeicaoPlanejada({
  nome,
  macros,
  itens,
  explicacao,
  hrefFoto,
  hrefAjustar,
  confirmacao,
  className,
}: {
  nome: string;
  macros: Macros;
  itens: readonly ItemAlimentar[];
  explicacao?: ExplicacaoDecisao;
  hrefFoto: string;
  hrefAjustar: string;
  /** Form da server action de confirmação, ocupando a linha inteira. */
  confirmacao: React.ReactNode;
  className?: string;
}) {
  return (
    // Esmaecida enquanto planejada: prescrição não é consumo.
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-surface-container/50 p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <UtensilsCrossed
          className="mt-1 size-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-title font-bold text-on-surface">{nome}</p>
          <p className="text-caption tracking-wide text-muted-foreground uppercase">
            Planejada
          </p>
          <p className="mt-1 text-body-sm tabular-nums text-muted-foreground">
            {macrosEmLinha(macros)}
          </p>
          <ul className="mt-2 flex flex-col gap-0.5 text-body-sm text-muted-foreground">
            {itens.map((alimento) => (
              <li key={alimento.descricao}>{alimento.descricao}</li>
            ))}
          </ul>
          {/* Enquanto planejada: é aqui, diante do prato, que a pergunta
              nasce. Confirmada, a refeição vira consumo real e o motivo
              da prescrição perde a função. */}
          <div className="mt-2">
            <ExplicacaoAgent pergunta="Por que esta refeição?" explicacao={explicacao} />
          </div>
        </div>
      </div>
      {/* Três saídas diante do prato, na ordem do esforço que exigem:
          comi como planejado (um toque), comi outra coisa (foto) e
          ajustar porções (edição item a item). Antes só as duas pontas
          existiam, e quem comeu algo diferente do plano — o caso mais
          comum — caía na edição manual por falta de alternativa.

          Empilhadas, e não numa linha: três rótulos lado a lado não
          cabem na largura de um celular — o primeiro botão vazava para
          fora do cartão. A confirmação ocupa a linha inteira porque é a
          ação esperada; as duas divergentes dividem a linha de baixo. */}
      <div className="mt-3 flex flex-col gap-2">
        {confirmacao}
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm" className="flex-1">
            <Link href={hrefFoto} aria-label={`Comi outra coisa no lugar de ${nome}`}>
              <Camera className="size-4" aria-hidden="true" /> Comi outra coisa
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="flex-1">
            <Link href={hrefAjustar} aria-label={`Editar ${nome}`}>
              <Pencil className="size-4" aria-hidden="true" /> Ajustar porções
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
