"use client";

import { useMemo, useState } from "react";
import { Check, Heart, Plus, Rocket, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoSelecao } from "@/components/tela";
import {
  buscarAlimentos,
  encontrarAlimento,
  porcoesDoAlimento,
  type Alimento,
} from "@/domain/alimentos/base";
import {
  adicionarAoPrato,
  itemDeAlimento,
  itemManual,
  removerDoPrato,
  subtotalDoPrato,
  type ItemPrato,
} from "@/domain/alimentos/prato";
import { ROTULO_CONFIANCA } from "@/domain/alimentos/proveniencia";
import type { ItemBiblioteca, Recorrente } from "@/domain/alimentos/repositorio";

type Aba = "busca" | "manual" | "favoritos";

const ABAS: ReadonlyArray<{ id: Aba; rotulo: string; Icone: typeof Search }> = [
  { id: "busca", rotulo: "Buscar", Icone: Search },
  { id: "manual", rotulo: "Manual", Icone: Plus },
  { id: "favoritos", rotulo: "Favoritos", Icone: Heart },
];

/**
 * Atalhos de Registro (telas 050–053) com o Prato (058) sempre
 * visível no rodapé, como no MacroFactor: o subtotal acompanha a
 * montagem em vez de aparecer só no fim.
 *
 * O Prato é estado local por natureza — existe enquanto a tela está
 * aberta e some ao sair, como a referência declara ("foods you added
 * will be cleared"). O que persiste é o registro, e ele só nasce no
 * submit.
 */
export function Atalhos({
  dia,
  fuso,
  favoritos,
  recorrentes,
  registrar,
  favoritar,
  salvarProprio,
}: {
  dia: string;
  fuso: string;
  favoritos: readonly ItemBiblioteca[];
  recorrentes: readonly Recorrente[];
  registrar: (formData: FormData) => Promise<void>;
  favoritar: (formData: FormData) => Promise<void>;
  salvarProprio: (formData: FormData) => Promise<void>;
}) {
  const [aba, setAba] = useState<Aba>("busca");
  const [termo, setTermo] = useState("");
  const [prato, setPrato] = useState<ItemPrato[]>([]);
  const [selecionado, setSelecionado] = useState<Alimento | null>(null);

  const resultados = useMemo(() => buscarAlimentos(termo), [termo]);
  const subtotal = subtotalDoPrato(prato);
  const favoritosDaBase = favoritos.flatMap((f) => {
    const alimento = f.alimentoId ? encontrarAlimento(f.alimentoId) : undefined;
    return alimento ? [alimento] : [];
  });
  // Alimentos criados na entrada manual (tela 052) vivem na mesma
  // biblioteca dos favoritos e precisam ser reutilizáveis com um
  // toque — senão "salvar" não produziria efeito algum.
  const proprios = favoritos.filter((f) => f.alimentoId === null && f.por100g);

  function adicionar(alimento: Alimento, quantidade: number, unidade: string) {
    setPrato((atual) => adicionarAoPrato(atual, itemDeAlimento(alimento.id, { quantidade, unidade })));
    setSelecionado(null);
    setTermo("");
  }

  return (
    // `flex-1` + `min-h-0` fazem a lista rolar dentro da tela e o Prato
    // permanecer ancorado no rodapé, em vez de subir junto do conteúdo
    // curto — é o comportamento da referência (MacroFactor 139–141).
    <div className="flex min-h-0 flex-1 flex-col">
      <nav aria-label="Atalhos de Registro" className="flex shrink-0 gap-1 border-b border-border px-4">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setAba(item.id)}
            aria-current={aba === item.id ? "page" : undefined}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-2 py-3 text-label-lg ${
              aba === item.id
                ? "border-on-surface-strong text-on-surface-strong"
                : "border-transparent text-muted-foreground"
            }`}
          >
            <item.Icone className="size-4" aria-hidden="true" />
            {item.rotulo}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {/* O seletor de porção vale para qualquer aba: escolher um
            alimento nos Favoritos precisa levar ao mesmo lugar que
            escolhê-lo na Busca, senão o toque não produz efeito. */}
        {selecionado ? (
          <SeletorDePorcao
            alimento={selecionado}
            onCancelar={() => setSelecionado(null)}
            onAdicionar={adicionar}
            favoritar={favoritar}
          />
        ) : null}

        {aba === "busca" && !selecionado ? (
          <section className="flex flex-col gap-3">
            <label className="text-label-md text-muted-foreground">
              Buscar alimento
              <Input
                value={termo}
                onChange={(evento) => setTermo(evento.target.value)}
                placeholder="Arroz, frango, banana…"
                className="mt-1 h-12"
              />
            </label>

            {termo.trim().length === 0 ? (
              <RecorrentesSugeridos recorrentes={recorrentes} onEscolher={setSelecionado} />
            ) : resultados.length === 0 ? (
              <p className="rounded-xl bg-surface-container p-4 text-body-md text-muted-foreground">
                Nada encontrado para “{termo}”. Use a aba Manual para registrar mesmo assim — o
                alimento fica salvo para a próxima vez.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {resultados.map((alimento) => (
                  <li key={alimento.id}>
                    <button
                      type="button"
                      onClick={() => setSelecionado(alimento)}
                      className="w-full rounded-xl border border-border bg-surface-container p-4 text-left"
                    >
                      <p className="text-title font-bold text-on-surface-strong">{alimento.nome}</p>
                      <p className="text-body-sm tabular-nums text-muted-foreground">
                        {alimento.por100g.calorias} kcal · {alimento.por100g.proteinaG}P ·{" "}
                        {alimento.por100g.carboidratosG}C · {alimento.por100g.gordurasG}G por 100 g
                      </p>
                      {/* Proveniência visível por alimento (user story 57). */}
                      <p className="mt-1 text-caption text-muted-foreground">
                        {alimento.proveniencia.fonte} · v{alimento.proveniencia.versao} ·{" "}
                        {ROTULO_CONFIANCA[alimento.confianca]}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {aba === "manual" && !selecionado ? (
          <EntradaManual
            onAdicionar={(item) => setPrato((p) => adicionarAoPrato(p, item))}
            salvarProprio={salvarProprio}
          />
        ) : null}

        {aba === "favoritos" && !selecionado ? (
          favoritosDaBase.length === 0 && proprios.length === 0 ? (
            <p className="rounded-xl bg-surface-container p-4 text-body-md text-muted-foreground">
              Nenhum favorito ainda. Busque um alimento e toque no coração para salvá-lo aqui.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {favoritosDaBase.map((alimento) => (
                <li key={alimento.id}>
                  <button
                    type="button"
                    onClick={() => setSelecionado(alimento)}
                    className="w-full rounded-xl border border-border bg-surface-container p-4 text-left"
                  >
                    <p className="text-title font-bold text-on-surface-strong">{alimento.nome}</p>
                    <p className="text-body-sm tabular-nums text-muted-foreground">
                      {alimento.por100g.calorias} kcal por 100 g
                    </p>
                  </button>
                </li>
              ))}
              {proprios.map((proprio) => (
                <li key={proprio.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const porcao = proprio.porcoes?.[0];
                      const gramas = porcao?.gramas ?? 100;
                      setPrato((atual) =>
                        adicionarAoPrato(
                          atual,
                          itemManual({
                            nome: proprio.nome,
                            quantidade: 1,
                            unidade: porcao?.unidade ?? "porção",
                            calorias: Math.round((proprio.por100g!.calorias * gramas) / 100),
                            proteinaG: Math.round((proprio.por100g!.proteinaG * gramas) / 100),
                            carboidratosG: Math.round((proprio.por100g!.carboidratosG * gramas) / 100),
                            gordurasG: Math.round((proprio.por100g!.gordurasG * gramas) / 100),
                            fibrasG: Math.round((proprio.por100g!.fibrasG * gramas) / 100),
                          }),
                        ),
                      );
                    }}
                    className="w-full rounded-xl border border-border bg-surface-container p-4 text-left"
                  >
                    <p className="text-title font-bold text-on-surface-strong">{proprio.nome}</p>
                    <p className="text-body-sm tabular-nums text-muted-foreground">
                      {proprio.por100g!.calorias} kcal por 100 g · seu alimento
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>

      <PratoRodape
        prato={prato}
        subtotal={subtotal}
        dia={dia}
        fuso={fuso}
        registrar={registrar}
        onRemover={(indice) => setPrato((atual) => removerDoPrato(atual, indice))}
      />
    </div>
  );
}

function RecorrentesSugeridos({
  recorrentes,
  onEscolher,
}: {
  recorrentes: readonly Recorrente[];
  onEscolher: (alimento: Alimento) => void;
}) {
  if (recorrentes.length === 0) {
    return (
      <p className="rounded-xl bg-surface-container p-4 text-body-md text-muted-foreground">
        Busque um alimento pelo nome. O que você registrar com frequência aparece aqui depois.
      </p>
    );
  }
  return (
    <section aria-label="Recorrentes" className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-label-md text-muted-foreground">
        <Rocket className="size-4" aria-hidden="true" /> Você registra com frequência
      </p>
      {recorrentes.map((recorrente) => {
        const alimento = encontrarAlimento(recorrente.alimentoId);
        if (!alimento) return null;
        return (
          <button
            key={recorrente.alimentoId}
            type="button"
            onClick={() => onEscolher(alimento)}
            className="w-full rounded-xl border border-border bg-surface-container p-4 text-left"
          >
            <p className="text-title font-bold text-on-surface-strong">{recorrente.descricao}</p>
            <p className="text-caption text-muted-foreground">
              {recorrente.vezes}× nos últimos registros
            </p>
          </button>
        );
      })}
    </section>
  );
}

function SeletorDePorcao({
  alimento,
  onAdicionar,
  onCancelar,
  favoritar,
}: {
  alimento: Alimento;
  onAdicionar: (alimento: Alimento, quantidade: number, unidade: string) => void;
  onCancelar: () => void;
  favoritar: (formData: FormData) => Promise<void>;
}) {
  const porcoes = porcoesDoAlimento(alimento.id);
  const [unidade, setUnidade] = useState(porcoes[1]?.unidade ?? "g");
  const [quantidade, setQuantidade] = useState(unidade === "g" ? "100" : "1");
  const numero = Number(quantidade.replace(",", ".")) || 0;
  const previa = numero > 0 ? itemDeAlimento(alimento.id, { quantidade: numero, unidade }) : null;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border-strong bg-surface-container p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-title-lg font-bold text-on-surface-strong">{alimento.nome}</h2>
          <p className="text-caption text-muted-foreground">
            {alimento.proveniencia.fonte} · v{alimento.proveniencia.versao} (
            {alimento.proveniencia.atualizadaEm})
          </p>
          <p className="text-caption text-muted-foreground">
            {ROTULO_CONFIANCA[alimento.confianca]}
          </p>
        </div>
        <form action={favoritar}>
          <input type="hidden" name="alimentoId" value={alimento.id} />
          <Button type="submit" variant="ghost" size="icon" aria-label={`Favoritar ${alimento.nome}`}>
            <Heart className="size-5" />
          </Button>
        </form>
      </div>

      <div className="flex items-end gap-2">
        <label className="text-caption text-muted-foreground">
          Quantidade
          <Input
            value={quantidade}
            onChange={(evento) => setQuantidade(evento.target.value)}
            inputMode="decimal"
            aria-label={`Quantidade de ${alimento.nome}`}
            className="mt-1 h-12 w-24 text-center text-lg font-bold tabular-nums"
          />
        </label>
        <CampoSelecao
          compacto
          id={`unidade-${alimento.id}`}
          rotulo="Unidade"
          className="flex-1"
          value={unidade}
          onChange={(evento) => {
            setUnidade(evento.target.value);
            setQuantidade(evento.target.value === "g" ? "100" : "1");
          }}
          aria-label={`Unidade de ${alimento.nome}`}
          opcoes={porcoes.map((porcao) => ({
            valor: porcao.unidade,
            rotulo:
              porcao.unidade === "g"
                ? "gramas"
                : `${porcao.unidade} (${porcao.gramas} g)`,
          }))}
        />
      </div>

      {previa ? (
        <p className="text-body-sm tabular-nums text-muted-foreground">
          {previa.calorias} kcal · {previa.proteinaG}P · {previa.carboidratosG}C · {previa.gordurasG}G
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onCancelar} className="flex-1">
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={() => onAdicionar(alimento, numero, unidade)}
          disabled={numero <= 0}
          className="flex-1"
        >
          <Plus className="size-4" aria-hidden="true" /> Adicionar ao Prato
        </Button>
      </div>
    </section>
  );
}

function EntradaManual({
  onAdicionar,
  salvarProprio,
}: {
  onAdicionar: (item: ItemPrato) => void;
  salvarProprio: (formData: FormData) => Promise<void>;
}) {
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [unidade, setUnidade] = useState("porção");
  const [macros, setMacros] = useState({ calorias: "", proteinaG: "", carboidratosG: "", gordurasG: "", fibrasG: "" });

  const campos = [
    { chave: "calorias", rotulo: "Energia (kcal)" },
    { chave: "proteinaG", rotulo: "Proteína (g)" },
    { chave: "carboidratosG", rotulo: "Carboidratos (g)" },
    { chave: "gordurasG", rotulo: "Gorduras (g)" },
    { chave: "fibrasG", rotulo: "Fibras (g)" },
  ] as const;

  return (
    <section className="flex flex-col gap-3">
      <p className="rounded-xl bg-surface-container p-3 text-body-sm text-muted-foreground">
        O que você informar aqui é registrado como estimativa sua, com confiança menor que a de uma
        tabela analítica — e fica marcado assim na auditoria.
      </p>
      <label className="text-caption text-muted-foreground">
        Alimento
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          aria-label="Nome do alimento"
          placeholder="Marmita da firma"
          className="mt-1 h-12"
        />
      </label>
      <div className="flex gap-2">
        <label className="flex-1 text-caption text-muted-foreground">
          Quantidade
          <Input
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            inputMode="decimal"
            aria-label="Quantidade"
            className="mt-1 h-12 text-center tabular-nums"
          />
        </label>
        <label className="flex-1 text-caption text-muted-foreground">
          Unidade
          <Input
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            aria-label="Unidade"
            className="mt-1 h-12"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {campos.map((campo) => (
          <label key={campo.chave} className="text-caption text-muted-foreground">
            {campo.rotulo}
            <Input
              value={macros[campo.chave]}
              onChange={(e) => setMacros((atual) => ({ ...atual, [campo.chave]: e.target.value }))}
              inputMode="numeric"
              aria-label={campo.rotulo}
              className="mt-1 h-12 text-center tabular-nums"
            />
          </label>
        ))}
      </div>
      <Button
        type="button"
        disabled={nome.trim().length === 0}
        onClick={() => {
          onAdicionar(
            itemManual({
              nome: nome.trim(),
              quantidade: Number(quantidade.replace(",", ".")) || 1,
              unidade: unidade.trim() || "porção",
              calorias: Number(macros.calorias) || 0,
              proteinaG: Number(macros.proteinaG) || 0,
              carboidratosG: Number(macros.carboidratosG) || 0,
              gordurasG: Number(macros.gordurasG) || 0,
              fibrasG: Number(macros.fibrasG) || 0,
            }),
          );
          setNome("");
          setMacros({ calorias: "", proteinaG: "", carboidratosG: "", gordurasG: "", fibrasG: "" });
        }}
      >
        <Plus className="size-4" aria-hidden="true" /> Adicionar ao Prato
      </Button>

      {/* Tela 052: "salvar como alimento reutilizável". Separado do
          botão acima de propósito — registrar hoje e guardar para
          sempre são decisões diferentes. */}
      <form action={salvarProprio}>
        <input type="hidden" name="nome" value={nome.trim()} />
        <input type="hidden" name="unidade" value={unidade.trim() || "porção"} />
        <input type="hidden" name="gramasPorcao" value={100} />
        {(
          ["calorias", "proteinaG", "carboidratosG", "gordurasG", "fibrasG"] as const
        ).map((chave) => (
          <input key={chave} type="hidden" name={chave} value={macros[chave] || 0} />
        ))}
        <Button type="submit" variant="ghost" disabled={nome.trim().length === 0} className="w-full">
          <Heart className="size-4" aria-hidden="true" /> Salvar como meu alimento
        </Button>
      </form>
    </section>
  );
}

function PratoRodape({
  prato,
  subtotal,
  dia,
  fuso,
  registrar,
  onRemover,
}: {
  prato: readonly ItemPrato[];
  subtotal: ReturnType<typeof subtotalDoPrato>;
  dia: string;
  fuso: string;
  registrar: (formData: FormData) => Promise<void>;
  onRemover: (indice: number) => void;
}) {
  return (
    <section
      aria-label="Prato"
      className="shrink-0 border-t border-border bg-surface-container px-4 pt-3 pb-4"
    >
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-label-lg font-bold text-on-surface-strong">
          Prato {prato.length > 0 ? `(${prato.length})` : ""}
        </h2>
        <p
          aria-label={`Subtotal do Prato: ${subtotal.calorias} kcal`}
          className="text-body-sm tabular-nums text-muted-foreground"
        >
          <strong className="text-on-surface-strong">{subtotal.calorias} kcal</strong> ·{" "}
          {subtotal.proteinaG}P · {subtotal.carboidratosG}C · {subtotal.gordurasG}G
        </p>
      </div>

      {prato.length === 0 ? (
        <p className="pb-2 text-body-sm text-muted-foreground">
          Adicione alimentos para montar a refeição e registrar tudo de uma vez.
        </p>
      ) : (
        <ul className="mb-3 flex max-h-40 flex-col gap-1 overflow-y-auto">
          {prato.map((item, indice) => (
            <li
              key={`${item.descricao}-${indice}`}
              className="flex items-center gap-2 rounded-lg bg-surface-container-high px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm text-on-surface-strong">{item.descricao}</p>
                <p className="text-caption tabular-nums text-muted-foreground">
                  {item.calorias} kcal · {ROTULO_CONFIANCA[item.confianca]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemover(indice)}
                aria-label={`Remover ${item.descricao} do Prato`}
                className="text-muted-foreground"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={registrar} className="flex gap-2">
        <input type="hidden" name="dia" value={dia} />
        <input type="hidden" name="fuso" value={fuso} />
        <input type="hidden" name="itens" value={JSON.stringify(prato)} />
        <Input name="nome" placeholder="Nome da refeição" aria-label="Nome da refeição" className="h-12 flex-1" />
        <Button type="submit" size="lg" disabled={prato.length === 0} className="h-12">
          <Check className="size-4" aria-hidden="true" /> Registrar
        </Button>
      </form>
    </section>
  );
}
