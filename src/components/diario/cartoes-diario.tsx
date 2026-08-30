import Link from "next/link";
import { Check, ChevronDown, Dumbbell, Pencil, Sparkles, UtensilsCrossed } from "lucide-react";
import { ExplicacaoAgent } from "@/components/tela/explicacao-agent";
import { Button } from "@/components/ui/button";
import type { ExplicacaoDecisao } from "@/domain/plano/tipos";
import type { ItemAlimentar, Macros } from "@/domain/diario/tipos";
import { cn } from "@/lib/utils";

const ROTULO_ESTIMATIVA = { foto: "Estimado por foto", texto: "Estimado pela sua descrição", audio: "Estimado pelo áudio que você gravou" } as const;
const ALTURA_RECOLHIDA = "h-52 overflow-hidden";
const macrosEmLinha = (m: Macros) => `${m.calorias} kcal · ${m.proteinaG}P · ${m.carboidratosG}C · ${m.gordurasG}G`;

function ListaAlimentos({ itens, completa }: { itens: readonly ItemAlimentar[]; completa: boolean }) {
  return <ul className={cn("mt-2 min-h-0 text-body-sm text-muted-foreground", completa ? "space-y-1" : "overflow-hidden")}>{itens.map((item, i) => <li key={`${item.descricao}-${i}`}>{item.descricao}</li>)}</ul>;
}

function Alternar({ expandido, aoAlternar }: { expandido: boolean; aoAlternar?: () => void }) {
  if (!aoAlternar) return null;
  return <Button type="button" variant="ghost" size="sm" onClick={aoAlternar} aria-expanded={expandido}>Ver {expandido ? "menos" : "mais"}<ChevronDown className={cn("size-4", expandido && "rotate-180")} aria-hidden="true" /></Button>;
}

export function CartaoSessaoDiario({ nome, estado, href }: { nome: string; estado: "em_andamento" | "concluida" | "abandonada"; href: string }) {
  const descricao = estado === "concluida" ? "Sessão de Treino concluída" : estado === "em_andamento" ? "Sessão de Treino em andamento" : "Sessão de Treino encerrada antes do fim";
  return <div className={cn(ALTURA_RECOLHIDA, "flex items-center gap-3 rounded-xl border border-border bg-surface-container p-4")}><Dumbbell className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="truncate text-title font-bold text-on-surface-strong">{nome}</p><p className="text-body-sm text-muted-foreground">{descricao}</p></div><Button asChild variant="ghost" size="sm"><Link href={href}>Ver</Link></Button></div>;
}

export function CartaoConsumo({ nome, macros, planejado, estimadoPorFoto = false, origemEstimativa, itens = [], expandido = false, aoAlternarExpansao, acoes }: { nome: string; macros: Macros; planejado?: Macros | null; estimadoPorFoto?: boolean; origemEstimativa?: "foto" | "texto" | "audio"; itens?: readonly ItemAlimentar[]; expandido?: boolean; aoAlternarExpansao?: () => void; acoes?: React.ReactNode }) {
  const delta = planejado ? macros.calorias - planejado.calorias : 0;
  return <div className={cn(!expandido && ALTURA_RECOLHIDA, "flex flex-col rounded-xl border border-success/40 bg-surface-container p-4")}><div className="flex min-h-0 items-start gap-3"><Check className="mt-1 size-5 shrink-0 text-success" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="truncate text-title font-bold text-on-surface-strong">{nome}</p>{estimadoPorFoto ? <p className="flex items-center gap-1 text-caption text-muted-foreground"><Sparkles className="size-3" aria-hidden="true" />{ROTULO_ESTIMATIVA[origemEstimativa ?? "foto"]}</p> : <p className="text-caption text-muted-foreground">Consumo registrado</p>}<p className="text-body-sm tabular-nums text-muted-foreground">{macrosEmLinha(macros)}</p><ListaAlimentos itens={itens} completa={expandido} />{expandido && planejado && delta !== 0 ? <p className="mt-2 text-caption text-muted-foreground">{delta > 0 ? `${delta} kcal a mais que` : `${Math.abs(delta)} kcal a menos que`} o planejado ({planejado.calorias} kcal)</p> : null}</div></div><div className="mt-auto flex flex-wrap items-center justify-end gap-1 pt-3"><Alternar expandido={expandido} aoAlternar={itens.length ? aoAlternarExpansao : undefined} />{acoes}</div></div>;
}

export function CartaoRefeicaoPlanejada({ nome, macros, itens, explicacao, hrefDivergencia, hrefAjustar, confirmacao, className, expandido = false, aoAlternarExpansao }: { nome: string; macros: Macros; itens: readonly ItemAlimentar[]; explicacao?: ExplicacaoDecisao; hrefDivergencia: string; hrefAjustar: string; confirmacao: React.ReactNode; className?: string; expandido?: boolean; aoAlternarExpansao?: () => void }) {
  return <div className={cn(!expandido && ALTURA_RECOLHIDA, "flex flex-col rounded-xl border border-dashed border-border bg-surface-container/50 p-4", className)}><div className="flex min-h-0 items-start gap-3"><UtensilsCrossed className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="truncate text-title font-bold text-on-surface">{nome}</p><p className="text-caption tracking-wide text-muted-foreground uppercase">Planejada</p><p className="mt-1 text-body-sm tabular-nums text-muted-foreground">{macrosEmLinha(macros)}</p><ListaAlimentos itens={itens} completa={expandido} />{expandido ? <div className="mt-2"><ExplicacaoAgent pergunta="Por que esta refeição?" explicacao={explicacao} /></div> : null}</div></div><div className="mt-auto flex flex-col gap-2 pt-3"><Alternar expandido={expandido} aoAlternar={aoAlternarExpansao} />{confirmacao}<div className="flex gap-2"><Button asChild variant="ghost" size="sm" className="min-w-0 flex-1"><Link href={hrefDivergencia} aria-label={`Comi outra coisa no lugar de ${nome}`}><UtensilsCrossed className="size-4" aria-hidden="true" /><span className="truncate">Comi outra coisa</span></Link></Button><Button asChild variant="ghost" size="sm" className="min-w-0 flex-1"><Link href={hrefAjustar} aria-label={`Editar ${nome}`}><Pencil className="size-4" aria-hidden="true" /><span className="truncate">Ajustar porções</span></Link></Button></div></div></div>;
}
