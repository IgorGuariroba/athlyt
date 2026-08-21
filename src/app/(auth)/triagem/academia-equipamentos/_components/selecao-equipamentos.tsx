"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Dumbbell,
  Home,
  PersonStanding,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import {
  CATEGORIAS_EQUIPAMENTO,
  EQUIPAMENTOS,
  equipamentosSugeridos,
  imagemEquipamento,
  type LocalTreinoId,
} from "@/domain/triagem/equipamentos";
import { CartaoRadio } from "@/components/tela/opcao-cartao";
import { CartaoSelecaoImagem } from "@/components/tela/cartao-selecao-imagem";
import { salvarEquipamentosPersonalizados } from "../../actions";
import { IMAGENS_EQUIPAMENTOS_REPDB } from "@/domain/triagem/imagens-equipamentos-repdb";

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
  equipamentosPersonalizadosIniciais,
  equipamentosPersonalizadosCadastradosIniciais,
}: {
  localInicial?: LocalTreinoId;
  equipamentosIniciais?: readonly string[];
  equipamentosPersonalizadosIniciais?: readonly string[];
  equipamentosPersonalizadosCadastradosIniciais?: readonly string[];
}) {
  const [local, setLocal] = useState<LocalTreinoId | undefined>(localInicial);
  const [selecionados, setSelecionados] = useState<Set<string>>(
    () => new Set(equipamentosIniciais ?? []),
  );
  const [busca, setBusca] = useState("");
  const [nomePersonalizado, setNomePersonalizado] = useState("");
  const [personalizadosCadastrados, setPersonalizadosCadastrados] =
    useState<string[]>(() => [
      ...new Set([
        ...(equipamentosPersonalizadosCadastradosIniciais ?? []),
        // Compatibilidade com perfis salvos antes de cadastro e seleção
        // serem conceitos separados.
        ...(equipamentosPersonalizadosIniciais ?? []),
      ]),
    ]);
  const [personalizadosSelecionados, setPersonalizadosSelecionados] =
    useState<Set<string>>(
      () => new Set(equipamentosPersonalizadosIniciais ?? []),
    );
  const [erroPersonalizado, setErroPersonalizado] = useState<string>();
  const [salvandoPersonalizados, setSalvandoPersonalizados] = useState(false);

  async function persistirPersonalizados(
    cadastrados: string[],
    personalizadosAtivos: Set<string>,
  ): Promise<boolean> {
    if (!local) {
      setErroPersonalizado("Selecione primeiro onde você treina.");
      return false;
    }
    setSalvandoPersonalizados(true);
    const resultado = await salvarEquipamentosPersonalizados({
      localTreino: local,
      equipamentos: [...selecionados],
      cadastrados,
      selecionados: [...personalizadosAtivos],
    });
    setSalvandoPersonalizados(false);
    if (!resultado.ok) {
      setErroPersonalizado(resultado.erro);
      return false;
    }
    return true;
  }

  async function adicionarPersonalizado() {
    const nome = nomePersonalizado.trim();
    if (nome.length < 2) {
      setErroPersonalizado("Digite o nome do equipamento.");
      return;
    }
    if (nome.length > 80) {
      setErroPersonalizado("Use no máximo 80 caracteres.");
      return;
    }
    if (personalizadosCadastrados.length >= 20) {
      setErroPersonalizado("Você pode adicionar até 20 equipamentos.");
      return;
    }
    if (
      personalizadosCadastrados.some(
        (existente) => normalizar(existente) === normalizar(nome),
      )
    ) {
      setErroPersonalizado("Esse equipamento já foi adicionado.");
      return;
    }
    const proximosCadastrados = [...personalizadosCadastrados, nome];
    const proximosSelecionados = new Set(personalizadosSelecionados).add(nome);
    if (
      !(await persistirPersonalizados(
        proximosCadastrados,
        proximosSelecionados,
      ))
    ) {
      return;
    }
    setPersonalizadosCadastrados(proximosCadastrados);
    setPersonalizadosSelecionados(proximosSelecionados);
    setNomePersonalizado("");
    setErroPersonalizado(undefined);
  }

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
            {selecionados.size + personalizadosSelecionados.size} selecionado
            {selecionados.size + personalizadosSelecionados.size === 1 ? "" : "s"}
          </p>

          <section className="flex flex-col gap-2" aria-labelledby="outro-equipamento">
            <div>
              <h2 id="outro-equipamento" className="text-label-md text-on-surface-strong">
                Não encontrou um equipamento?
              </h2>
              <p className="text-body-sm text-muted-foreground">
                Adicione pelo nome para que ele também seja considerado no plano.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={nomePersonalizado}
                onChange={(evento) => {
                  setNomePersonalizado(evento.target.value);
                  setErroPersonalizado(undefined);
                }}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter") {
                    evento.preventDefault();
                    adicionarPersonalizado();
                  }
                }}
                placeholder="Ex.: Belt squat"
                aria-label="Nome do equipamento"
                aria-describedby={erroPersonalizado ? "erro-equipamento" : undefined}
                className="h-12 min-w-0 flex-1 text-base"
              />
              <button
                type="button"
                onClick={adicionarPersonalizado}
                disabled={salvandoPersonalizados}
                className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-on-surface-strong px-4 text-label-md text-background disabled:cursor-wait disabled:opacity-60"
              >
                <Plus className="size-5" aria-hidden="true" />
                Adicionar
              </button>
            </div>
            {erroPersonalizado ? (
              <p id="erro-equipamento" role="alert" className="text-body-sm text-destructive">
                {erroPersonalizado}
              </p>
            ) : null}

            {personalizadosCadastrados.map((nome) => (
              <div key={normalizar(nome)}>
                <CartaoSelecaoImagem
                  id={`equipamento-personalizado-${normalizar(nome)}`}
                  name="equipamentosPersonalizados"
                  value={nome}
                  rotulo={nome}
                  src="/equipamentos/personalizado.svg"
                  loading="eager"
                  checked={personalizadosSelecionados.has(nome)}
                  onCheckedChange={async (marcado) => {
                    const proximos = new Set(personalizadosSelecionados);
                    if (marcado) proximos.add(nome);
                    else proximos.delete(nome);
                    if (
                      await persistirPersonalizados(
                        personalizadosCadastrados,
                        proximos,
                      )
                    ) {
                      setPersonalizadosSelecionados(proximos);
                    }
                  }}
                  acao={
                    <button
                      type="button"
                      onClick={async (evento) => {
                        evento.preventDefault();
                        const proximosCadastrados = personalizadosCadastrados.filter(
                          (item) => item !== nome,
                        );
                        const proximosSelecionados = new Set(personalizadosSelecionados);
                        proximosSelecionados.delete(nome);
                        if (
                          !(await persistirPersonalizados(
                            proximosCadastrados,
                            proximosSelecionados,
                          ))
                        ) return;
                        setPersonalizadosCadastrados(proximosCadastrados);
                        setPersonalizadosSelecionados(proximosSelecionados);
                      }}
                      disabled={salvandoPersonalizados}
                      aria-label={`Excluir ${nome}`}
                      title={`Excluir ${nome}`}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-border-strong text-muted-foreground transition-colors hover:border-on-surface-strong hover:text-on-surface-strong"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  }
                />
                <input
                  type="hidden"
                  name="equipamentosPersonalizadosCadastrados"
                  value={nome}
                />
              </div>
            ))}
          </section>

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
                    <CartaoSelecaoImagem
                      key={equipamento.id}
                      id={`equipamento-${equipamento.id}`}
                      name="equipamentos"
                      value={equipamento.id}
                      rotulo={equipamento.rotulo}
                      src={
                        IMAGENS_EQUIPAMENTOS_REPDB[equipamento.id as keyof typeof IMAGENS_EQUIPAMENTOS_REPDB] ??
                        imagemEquipamento(equipamento.id)
                      }
                      loading="eager"
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
