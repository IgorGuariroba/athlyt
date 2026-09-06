"use client";

import { useState, type ComponentProps } from "react";
import { Plus, RefreshCw, Trash2, TriangleAlert } from "lucide-react";

import { AcrescentarAlimento } from "./acrescentar-alimento";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  macrosDesatualizados,
  nomeDoItem,
  origemDaEstimativa,
  reescalarItem,
  removerDoPrato,
  renomearItem,
  subtotalDoPrato,
  type ItemPrato,
  type OrigemEstimativa,
} from "@/domain/alimentos/prato";
import { rotuloDeConfianca, type Confianca } from "@/domain/alimentos/proveniencia";
import { cn } from "@/lib/utils";

/**
 * Revisão dos itens que a IA estimou antes de virarem Consumo Real.
 * Toda estimativa deve ser apresentada para revisão.
 *
 * Mora no catálogo, e não na rota, porque a mesma revisão serve foto,
 * texto e áudio: o que muda entre os três é como a estimativa nasceu,
 * não o que o atleta faz com ela — corrigir a porção, corrigir o
 * alimento, remover o que não comeu, acrescentar o que faltou.
 *
 * Três decisões ficam guardadas aqui:
 *
 * - o rótulo de confiança acompanha **cada item**, com a origem certa:
 *   "pouco visível na foto" seria falso sobre um prato que ninguém
 *   fotografou;
 * - a porção descrita pelo atleta ("uma colher de sopa") fica ao lado
 *   das gramas, porque é ela que ele reconhece ao conferir — o número
 *   em gramas é a tradução do modelo, não a memória dele;
 * - o total recalcula a cada edição e fica visível antes do botão de
 *   confirmar, nunca depois.
 *
 * Corrigir o nome não mexe nos macros sozinho, mas há correções que
 * trocam o alimento e não só o rótulo ("cola" → "cola zero"). Quando
 * o nome deixa de ser aquele para o qual os números foram estimados, a
 * linha diz isso e oferece o recálculo daquele item. O botão é
 * explícito de propósito: reestimar durante a digitação gastaria uma
 * chamada por tecla e sobrescreveria em silêncio um valor que o atleta
 * pode ter ajustado à mão. Ignorar o aviso também é uma escolha válida
 * — desde que seja uma escolha, e não um número errado que passou
 * despercebido.
 *
 * Acrescentar o que faltou usa as **mesmas entradas do registro
 * inicial** (escrever, falar, fotografar), e não um formulário de
 * macros: pedir kcal e proteína digitados era o único ponto do app a
 * exigir do atleta justamente o número que o app calcula. Quem monta
 * esse acréscimo é `AcrescentarAlimento`, injetado por `acrescimo` —
 * a revisão não conhece server action nenhuma, e continua servindo
 * telas que não têm IA por perto.
 *
 * O estado vive no pai: a confirmação pertence à tela, e o que ela
 * confirma precisa ser exatamente o que esta lista mostra.
 */
export function RevisaoEstimativa({
  itens,
  aoMudar,
  porcoesDescritas,
  nomesEstimados,
  aoRecalcularItem,
  limitacoes,
  confianca,
  origemEstimativa,
  acrescimo,
  className,
}: {
  itens: readonly ItemPrato[];
  aoMudar: (itens: ItemPrato[]) => void;
  /** Porção em linguagem comum, por item, na ordem da estimativa original. */
  porcoesDescritas?: readonly string[];
  /**
   * Nome para o qual os macros de cada item foram estimados. Difere do
   * nome atual exatamente quando o atleta corrigiu o alimento.
   */
  nomesEstimados?: readonly string[];
  /**
   * Recalcula um item. Ausente, a linha apenas avisa da defasagem — o
   * aviso é verdade mesmo onde não há IA disponível para resolvê-la.
   */
  aoRecalcularItem?: (indice: number) => Promise<void>;
  limitacoes: readonly string[];
  /**
   * Confiança **do conjunto**. Ausente quando não houve estimativa de
   * conjunto — ao editar um consumo já gravado, por exemplo. A tarja
   * some junto: inventá-la fazia a tela anunciar "porção não informada"
   * sobre uma porção que o modelo estimou da foto. A marca **por item**
   * não depende disto e permanece sempre.
   */
  confianca?: Confianca;
  origemEstimativa: OrigemEstimativa;
  /**
   * Como acrescentar o que faltou; ausente, a revisão só corrige o que
   * já está na lista. `aoAcrescentar` e `aoFechar` ficam de fora porque
   * são desta revisão: os itens somam ao prato que ela exibe.
   */
  acrescimo?: Omit<
    ComponentProps<typeof AcrescentarAlimento>,
    "aoAcrescentar" | "aoFechar"
  >;
  className?: string;
}) {
  const [adicionando, setAdicionando] = useState(false);
  const [recalculando, setRecalculando] = useState<number | null>(null);
  const subtotal = subtotalDoPrato(itens);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* A incerteza aparece antes da lista, não em nota de rodapé: é o
          que impede a estimativa de ser lida como medição — mas só
          quando houve mesmo uma estimativa de conjunto de que falar. */}
      {confianca ? (
        <div className="flex gap-3 rounded-xl border border-border bg-surface-container px-4 py-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-label-md text-on-surface-strong">
              {rotuloDeConfianca(confianca, "estimativa-ia", origemEstimativa)}
            </p>
            {limitacoes.length > 0 ? (
              <ul className="flex flex-col gap-0.5 text-body-sm text-muted-foreground">
                {limitacoes.map((limitacao) => (
                  <li key={limitacao}>{limitacao}</li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-muted-foreground">
                Números aproximados a partir do que você descreveu. Ajuste o que estiver fora.
              </p>
            )}
          </div>
        </div>
      ) : null}

      <ul className="flex flex-col gap-2">
        {itens.map((item, indice) => {
          const nome = nomeDoItem(item);
          const porcao = porcoesDescritas?.[indice];
          const nomeEstimado = nomesEstimados?.[indice];
          const defasado =
            nomeEstimado !== undefined && macrosDesatualizados(item, nomeEstimado);
          return (
            <li
              key={`item-${indice}`}
              className="flex flex-col gap-2 rounded-xl border border-border bg-surface-container p-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={nome}
                  aria-label={`Alimento ${indice + 1}`}
                  onChange={(evento) =>
                    aoMudar(
                      itens.map((alvo, i) =>
                        i === indice ? renomearItem(alvo, evento.target.value) : alvo,
                      ),
                    )
                  }
                  className="h-11 min-w-0 flex-1"
                />
                {/* A unidade é a que o modelo declarou, e o rótulo a
                    repete: pedir "gramas" de um refrigerante convidaria
                    o atleta a converter volume em massa de cabeça. */}
                <label className="flex shrink-0 items-center gap-1">
                  <Input
                    value={String(item.quantidade)}
                    inputMode="numeric"
                    aria-label={`Quantidade de ${nome} em ${item.unidade}`}
                    onChange={(evento) => {
                      const quantidade = Number(evento.target.value.replace(",", "."));
                      if (!Number.isFinite(quantidade) || quantidade <= 0) return;
                      aoMudar(
                        itens.map((alvo, i) =>
                          i === indice ? reescalarItem(alvo, quantidade) : alvo,
                        ),
                      );
                    }}
                    className="h-11 w-16 text-center tabular-nums"
                  />
                  <span className="text-body-sm text-muted-foreground">{item.unidade}</span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover ${nome}`}
                  onClick={() => aoMudar(removerDoPrato(itens, indice))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {porcao ? (
                <p className="text-caption text-muted-foreground">você descreveu: {porcao}</p>
              ) : null}
              <p className="text-caption tabular-nums text-muted-foreground">
                {item.calorias} kcal · {item.proteinaG}P · {item.carboidratosG}C ·{" "}
                {item.gordurasG}G ·{" "}
                {/* A origem é a do item, não a da tela: uma linha
                    recalculada pelo nome deixou de vir da foto. */}
                {rotuloDeConfianca(
                  item.confianca,
                  item.origemDado,
                  origemDaEstimativa(item, origemEstimativa),
                )}
              </p>

              {/* O aviso nomeia o alimento a que os números se referem:
                  "macros desatualizados" sozinho não diz ao atleta o
                  que ele está prestes a gravar. */}
              {defasado ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-caption text-warning">
                    Estes números são de “{nomeEstimado}”.
                  </p>
                  {aoRecalcularItem ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={recalculando !== null}
                      onClick={() => {
                        setRecalculando(indice);
                        void aoRecalcularItem(indice).finally(() => setRecalculando(null));
                      }}
                    >
                      <RefreshCw
                        className={cn("size-3.5", recalculando === indice && "animate-spin")}
                        aria-hidden="true"
                      />
                      {recalculando === indice ? "Recalculando…" : `Recalcular ${nome}`}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* Acrescentar o que a IA não captou é parte da revisão, não um
          fluxo à parte: sem isso, uma omissão obrigaria a recomeçar a
          descrição inteira. As entradas são as mesmas do registro
          inicial, e nenhuma delas pede macro digitado. */}
      {acrescimo && adicionando ? (
        <AcrescentarAlimento
          {...acrescimo}
          aoFechar={() => setAdicionando(false)}
          aoAcrescentar={(novos) => {
            aoMudar([...itens, ...novos]);
            setAdicionando(false);
          }}
        />
      ) : acrescimo ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setAdicionando(true)}
        >
          <Plus className="size-4" aria-hidden="true" /> Faltou um alimento
        </Button>
      ) : null}

      <div className="flex items-baseline justify-between gap-3 rounded-xl bg-surface-container-high px-4 py-3">
        <span className="text-label-lg text-on-surface-strong">Total estimado</span>
        <span className="text-body-sm tabular-nums text-muted-foreground">
          <strong className="text-on-surface-strong">{subtotal.calorias} kcal</strong> ·{" "}
          {subtotal.proteinaG}P · {subtotal.carboidratosG}C · {subtotal.gordurasG}G
        </span>
      </div>
    </div>
  );
}
