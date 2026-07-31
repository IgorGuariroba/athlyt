"use client";

import { useMemo, useState } from "react";
import { Building2, Dumbbell, Home, PersonStanding, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import {
  CATEGORIAS_EQUIPAMENTO,
  EQUIPAMENTOS,
  equipamentosSugeridos,
  type LocalTreinoId,
} from "@/domain/triagem/equipamentos";
import { CartaoCheckbox, CartaoRadio } from "../../_components/opcao-cartao";

const LOCAIS = [
  {
    value: "academia-completa",
    titulo: "Academia completa",
    descricao: "Máquinas, cabos e área de pesos livres",
    Icone: Dumbbell,
  },
  {
    value: "condominio",
    titulo: "Academia de condomínio",
    descricao: "Espaço compacto, equipamentos limitados",
    Icone: Building2,
  },
  {
    value: "casa",
    titulo: "Casa",
    descricao: "Halteres, elásticos e acessórios básicos",
    Icone: Home,
  },
  {
    value: "sem-equipamentos",
    titulo: "Sem equipamentos",
    descricao: "Apenas exercícios com o peso do corpo",
    Icone: PersonStanding,
  },
] as const satisfies readonly {
  value: LocalTreinoId;
  titulo: string;
  descricao: string;
  Icone: typeof Dumbbell;
}[];

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Seleção de local e equipamentos (specs/workflow/telas/018; âncoras
 * `alpha-progression/020` e `fitbod/011..012`).
 *
 * A etapa é interativa por necessidade, não por enfeite: escolher o
 * local **pré-marca** um conjunto plausível de equipamentos, que o
 * usuário então revisa. Marcar trinta caixas do zero é trabalho que
 * ninguém faz com honestidade — e um catálogo respondido às pressas
 * vira exercício inviável no plano.
 *
 * A revisão manual continua soberana: uma vez que o usuário mexe na
 * lista, trocar o local reabre a sugestão (o local é a pergunta mais
 * grossa; se ele mudou, o conjunto anterior perdeu sentido).
 */
export function SelecaoEquipamentos({
  localInicial,
  equipamentosIniciais,
}: {
  localInicial?: LocalTreinoId;
  equipamentosIniciais?: readonly string[];
}) {
  const [local, setLocal] = useState<LocalTreinoId | undefined>(localInicial);
  const [selecionados, setSelecionados] = useState<Set<string>>(
    () => new Set(equipamentosIniciais ?? []),
  );
  const [busca, setBusca] = useState("");

  function escolherLocal(novoLocal: string) {
    const localId = novoLocal as LocalTreinoId;
    setLocal(localId);
    setSelecionados(new Set(equipamentosSugeridos(localId)));
  }

  function alternar(id: string) {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  const termo = normalizar(busca.trim());
  const visiveis = useMemo(() => {
    if (!termo) return EQUIPAMENTOS;
    return EQUIPAMENTOS.filter((e) => normalizar(e.rotulo).includes(termo));
  }, [termo]);

  const categoriasVisiveis = CATEGORIAS_EQUIPAMENTO.map((categoria) => ({
    ...categoria,
    itens: visiveis.filter((e) => e.categoria === categoria.id),
  })).filter((categoria) => categoria.itens.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <RadioGroup
          name="localTreino"
          value={local}
          onValueChange={escolherLocal}
          required
          className="gap-3"
        >
          {LOCAIS.map((opcao) => (
            <CartaoRadio
              key={opcao.value}
              id={`local-${opcao.value}`}
              value={opcao.value}
              titulo={opcao.titulo}
              descricao={opcao.descricao}
              Icone={opcao.Icone}
            />
          ))}
        </RadioGroup>
      </div>

      {local && local !== "sem-equipamentos" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-label-md text-muted-foreground">
              Equipamentos disponíveis
            </p>
            <p className="text-body-sm text-muted-foreground">
              Marcamos os mais comuns para esse local. Revise: o plano só
              prescreve exercícios com o que estiver selecionado.
            </p>
          </div>

          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar equipamento"
              aria-label="Buscar equipamento"
              className="h-12 pl-9 text-base"
            />
          </div>

          <p aria-live="polite" className="text-body-sm text-muted-foreground">
            {selecionados.size} selecionado
            {selecionados.size === 1 ? "" : "s"}
          </p>

          {categoriasVisiveis.length === 0 ? (
            <p className="py-6 text-center text-body-sm text-muted-foreground">
              Nenhum equipamento encontrado para “{busca.trim()}”.
            </p>
          ) : (
            categoriasVisiveis.map((categoria) => (
              <div key={categoria.id} className="flex flex-col gap-2">
                <h2 className="text-label-md text-on-surface-strong">
                  {categoria.rotulo}
                </h2>
                <div className="grid grid-cols-1 gap-2">
                  {categoria.itens.map((equipamento) => (
                    <CartaoCheckbox
                      key={equipamento.id}
                      id={`equipamento-${equipamento.id}`}
                      name="equipamentos"
                      value={equipamento.id}
                      titulo={equipamento.rotulo}
                      checked={selecionados.has(equipamento.id)}
                      onCheckedChange={() => alternar(equipamento.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {/*
        Fora da busca, um equipamento selecionado continua existindo:
        `<input hidden>` garante que a seleção viaje inteira no submit,
        já que o cartão filtrado não está no DOM.
      */}
      {local && local !== "sem-equipamentos"
        ? [...selecionados]
            .filter(
              (id) => !categoriasVisiveis.some((c) => c.itens.some((e) => e.id === id)),
            )
            .map((id) => (
              <input key={id} type="hidden" name="equipamentos" value={id} />
            ))
        : null}
    </div>
  );
}

/** Rótulo do local, para reuso em telas de leitura (resumo, perfil). */
export const LOCAIS_TREINO = LOCAIS;
