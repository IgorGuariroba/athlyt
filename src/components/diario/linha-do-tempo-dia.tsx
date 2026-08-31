"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FONTE_ESTIMATIVA } from "@/domain/alimentos/prato";
import type { ItemLinhaDoTempo } from "@/domain/diario/tipos";
import { CartaoConsumo, CartaoRefeicaoPlanejada, CartaoSessaoDiario } from "./cartoes-diario";
import { LinhaDoTempoDiario } from "./linha-do-tempo";

export function LinhaDoTempoDia({ itens, dia, fuso, confirmar, desfazer, excluir = desfazer, apenasAlimentar = false, agora = new Date() }: { itens: readonly ItemLinhaDoTempo[]; dia: string; fuso: string; confirmar: (formData: FormData) => void | Promise<void>; desfazer: (formData: FormData) => void | Promise<void>; excluir?: (formData: FormData) => void | Promise<void>; apenasAlimentar?: boolean; agora?: Date }) {
  const [expandido, setExpandido] = useState<string | null>(null);
  const horaAtual = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit", hour12: false }).format(agora);
  const visiveis = apenasAlimentar ? itens.filter((item) => item.tipo !== "sessao") : itens;
  const eventos = [...visiveis.map((item) => ({ id: chave(item), horaLocal: item.horaLocal, conteudo: cartao(item, dia, fuso, confirmar, desfazer, excluir, expandido, setExpandido) })), {
    id: "adicionar-refeicao-extra", horaLocal: horaAtual,
    conteudo: <div className="flex h-72 items-center rounded-xl border border-dashed border-border bg-surface-container/50 p-4"><Button asChild variant="ghost" className="h-auto w-full justify-start whitespace-normal"><Link href={`/diario/registrar/metodo?dia=${dia}`} aria-label="Adicionar refeição extra"><Plus className="size-5" aria-hidden="true" /><span><strong className="block">Adicionar refeição extra</strong><small className="text-muted-foreground">Foto, texto, áudio ou busca manual</small></span></Link></Button></div>
  }].sort((a, b) => a.horaLocal.localeCompare(b.horaLocal));
  return <LinhaDoTempoDiario itens={eventos} />;
}

export function contarItensDoDia(itens: readonly ItemLinhaDoTempo[], apenasAlimentar = false): number { return apenasAlimentar ? itens.filter((item) => item.tipo !== "sessao").length : itens.length; }
function chave(item: ItemLinhaDoTempo): string { return item.tipo === "planejada" ? `planejada-${item.entrada.refeicaoRef}` : item.tipo === "consumo" ? `consumo-${item.consumo.id}` : `sessao-${item.sessaoId}`; }

function cartao(item: ItemLinhaDoTempo, dia: string, fuso: string, confirmar: (f: FormData) => void | Promise<void>, desfazer: (f: FormData) => void | Promise<void>, excluir: (f: FormData) => void | Promise<void>, expandido: string | null, setExpandido: (id: string | null) => void) {
  const id = chave(item); const aberto = expandido === id; const alternar = () => setExpandido(aberto ? null : id);
  if (item.tipo === "sessao") return <CartaoSessaoDiario nome={item.nome} estado={item.estado} href={item.estado === "concluida" ? `/sessao/${item.sessaoId}/resumo` : `/sessao/${item.sessaoId}`} />;
  if (item.tipo === "consumo") {
    const { consumo } = item;
    const estimados = consumo.itens.filter((i) => (i as { origemDado?: string }).origemDado === "estimativa-ia") as { fonte?: string }[];
    return <CartaoConsumo nome={consumo.nome} macros={consumo.macros} planejado={consumo.planejado} itens={consumo.itens} estimadoPorFoto={estimados.length > 0} origemEstimativa={origemDaEstimativa(estimados)} expandido={aberto} aoAlternarExpansao={alternar} acoes={<><Button asChild variant="ghost" size="sm"><Link href={`/diario/registrar/descricao?dia=${dia}&consumo=${consumo.id}`} aria-label={`Editar consumo ${consumo.nome}`}><Pencil className="size-4" aria-hidden="true" />Editar</Link></Button><form action={excluir}><CamposContexto dia={dia} fuso={fuso} consumoId={consumo.id} refeicaoRef={consumo.refeicaoRef ?? undefined} /><Button type="submit" variant="ghost" size="sm" aria-label={`Excluir consumo ${consumo.nome}`}><Trash2 className="size-4" aria-hidden="true" />Excluir</Button></form></>} />;
  }
  const { entrada } = item;
  return <CartaoRefeicaoPlanejada nome={entrada.nome} macros={entrada.macros} itens={entrada.itens} explicacao={entrada.explicacao} hrefDivergencia={`/diario/registrar/metodo?dia=${dia}&refeicao=${encodeURIComponent(entrada.refeicaoRef)}`} hrefAjustar={`/diario/refeicao/${encodeURIComponent(entrada.refeicaoRef)}?dia=${dia}`} expandido={aberto} aoAlternarExpansao={alternar} confirmacao={<form action={confirmar}><CamposContexto dia={dia} fuso={fuso} refeicaoRef={entrada.refeicaoRef} /><Button type="submit" className="w-full" aria-label={`Comi como planejado: ${entrada.nome}`}><Check className="size-4" aria-hidden="true" />Comi como planejado</Button></form>} />;
}
function origemDaEstimativa(itens: readonly { fonte?: string }[]): "foto" | "texto" | "audio" | undefined { if (!itens.length) return undefined; if (itens.some((i) => i.fonte === FONTE_ESTIMATIVA.audio)) return "audio"; if (itens.some((i) => i.fonte === FONTE_ESTIMATIVA.texto)) return "texto"; return "foto"; }
function CamposContexto({ dia, fuso, refeicaoRef, consumoId }: { dia: string; fuso: string; refeicaoRef?: string; consumoId?: string }) { return <><input type="hidden" name="dia" value={dia} /><input type="hidden" name="fuso" value={fuso} />{refeicaoRef ? <input type="hidden" name="refeicaoRef" value={refeicaoRef} /> : null}{consumoId ? <input type="hidden" name="consumoId" value={consumoId} /> : null}</>; }
