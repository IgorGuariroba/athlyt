"use client";

import { useState } from "react";
import { Plus, RefreshCw, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adicionarAoPrato,
  itemManual,
  macrosDesatualizados,
  nomeDoItem,
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
 * Revisão dos itens que a IA estimou, antes de virarem Consumo Real
 * (ADR 0002, decisão 4: a estimativa é sempre apresentada para
 * revisão).
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
 *   fotografou (user story 9);
 * - a porção descrita pelo atleta ("uma colher de sopa") fica ao lado
 *   das gramas, porque é ela que ele reconhece ao conferir — o número
 *   em gramas é a tradução do modelo, não a memória dele;
 * - o total recalcula a cada edição e fica visível antes do botão de
 *   confirmar, nunca depois (user story 16).
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
 * O item acrescentado à mão entra como entrada do atleta
 * (`origemDado: "usuario"`), não como estimativa da IA: atribuir ao
 * modelo um alimento que ele nunca propôs falsificaria a auditoria na
 * direção mais enganosa possível.
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
  confianca: Confianca;
  origemEstimativa: OrigemEstimativa;
  className?: string;
}) {
  const [adicionando, setAdicionando] = useState(false);
  const [recalculando, setRecalculando] = useState<number | null>(null);
  const subtotal = subtotalDoPrato(itens);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* A incerteza aparece antes da lista, não em nota de rodapé: é o
          que impede a estimativa de ser lida como medição. */}
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
                <label className="flex shrink-0 items-center gap-1">
                  <Input
                    value={String(item.quantidade)}
                    inputMode="numeric"
                    aria-label={`Gramas de ${nome}`}
                    onChange={(evento) => {
                      const gramas = Number(evento.target.value.replace(",", "."));
                      if (!Number.isFinite(gramas) || gramas <= 0) return;
                      aoMudar(
                        itens.map((alvo, i) => (i === indice ? reescalarItem(alvo, gramas) : alvo)),
                      );
                    }}
                    className="h-11 w-16 text-center tabular-nums"
                  />
                  <span className="text-body-sm text-muted-foreground">g</span>
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
                {rotuloDeConfianca(item.confianca, item.origemDado, origemEstimativa)}
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
                      onClick={async () => {
                        setRecalculando(indice);
                        try {
                          await aoRecalcularItem(indice);
                        } finally {
                          setRecalculando(null);
                        }
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
          descrição inteira (user story 15). */}
      {adicionando ? (
        <FormularioItemFaltante
          aoCancelar={() => setAdicionando(false)}
          aoAdicionar={(item) => {
            aoMudar(adicionarAoPrato(itens, item));
            setAdicionando(false);
          }}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setAdicionando(true)}
        >
          <Plus className="size-4" aria-hidden="true" /> Faltou um alimento
        </Button>
      )}

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

/**
 * Item que o atleta acrescenta à mão. Pede energia e macros porque não
 * há de onde inferi-los: inventar zeros seria pior que pedir — o total
 * ficaria errado sem nada na tela dizendo por quê.
 */
function FormularioItemFaltante({
  aoAdicionar,
  aoCancelar,
}: {
  aoAdicionar: (item: ItemPrato) => void;
  aoCancelar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [gramas, setGramas] = useState("100");
  const [macros, setMacros] = useState({
    calorias: "",
    proteinaG: "",
    carboidratosG: "",
    gordurasG: "",
  });

  const campos = [
    { chave: "calorias", rotulo: "Energia (kcal)" },
    { chave: "proteinaG", rotulo: "Proteína (g)" },
    { chave: "carboidratosG", rotulo: "Carboidratos (g)" },
    { chave: "gordurasG", rotulo: "Gorduras (g)" },
  ] as const;

  return (
    <section
      aria-label="Acrescentar alimento"
      className="flex flex-col gap-3 rounded-xl border border-border-strong bg-surface-container p-3"
    >
      <div className="flex gap-2">
        <label className="min-w-0 flex-1 text-caption text-muted-foreground">
          Alimento
          <Input
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            aria-label="Alimento que faltou"
            placeholder="Pão de queijo"
            className="mt-1 h-11"
          />
        </label>
        <label className="shrink-0 text-caption text-muted-foreground">
          Gramas
          <Input
            value={gramas}
            onChange={(evento) => setGramas(evento.target.value)}
            inputMode="numeric"
            aria-label="Gramas do alimento que faltou"
            className="mt-1 h-11 w-20 text-center tabular-nums"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {campos.map((campo) => (
          <label key={campo.chave} className="text-caption text-muted-foreground">
            {campo.rotulo}
            <Input
              value={macros[campo.chave]}
              onChange={(evento) =>
                setMacros((atual) => ({ ...atual, [campo.chave]: evento.target.value }))
              }
              inputMode="numeric"
              aria-label={campo.rotulo}
              className="mt-1 h-11 text-center tabular-nums"
            />
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={nome.trim().length === 0}
          onClick={() =>
            aoAdicionar(
              itemManual({
                nome: nome.trim(),
                quantidade: Number(gramas.replace(",", ".")) || 100,
                unidade: "g",
                calorias: Number(macros.calorias) || 0,
                proteinaG: Number(macros.proteinaG) || 0,
                carboidratosG: Number(macros.carboidratosG) || 0,
                gordurasG: Number(macros.gordurasG) || 0,
                fibrasG: 0,
              }),
            )
          }
        >
          <Plus className="size-4" aria-hidden="true" /> Acrescentar
        </Button>
      </div>
    </section>
  );
}
