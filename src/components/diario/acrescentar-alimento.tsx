"use client";

import { useState } from "react";
import { Camera, Mic, PencilLine, Plus, Sparkles, TriangleAlert } from "lucide-react";

import { CapturaFoto } from "@/components/fotos/captura-foto";
import { reduzirImagemParaEnvio } from "@/components/fotos/reduzir-imagem";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LIMITE_DESCRICAO } from "@/domain/alimentos/audio-refeicao";
import type { ItemPrato } from "@/domain/alimentos/prato";
import { cn } from "@/lib/utils";
import { CapturaAudio } from "./captura-audio";

/**
 * Acréscimo de alimento a um prato já estimado, pelas **mesmas três
 * entradas do registro inicial**: escrever, falar ou fotografar.
 *
 * Existe porque o acréscimo era o único ponto do app que pedia ao
 * atleta energia e macros digitados à mão — justamente o número que o
 * app existe para calcular. O formulário que fazia isso se justificava
 * por "não há de onde inferi-los", o que deixou de ser verdade quando
 * `estimarRefeicaoPorDescricao` e `estimarRefeicaoPorFoto` passaram a
 * servir a revisão: a mesma pergunta que monta o prato monta uma linha
 * a mais dele.
 *
 * O que é descartado de propósito: o **nome** que a estimativa devolve.
 * Quem acrescenta um pão de queijo ao café da manhã não está renomeando
 * a refeição para "Pão de queijo" — o prato já tem dono, e só os itens
 * dele estão em jogo aqui.
 *
 * Os itens entram **direto na lista**, sem confirmação intermediária:
 * a linha nova nasce editável, com porção corrigível e lixeira, na
 * mesma revisão que o atleta já está usando. Uma etapa de confirmação
 * antes da lista duplicaria a revisão que vem logo depois.
 */

/**
 * Resposta de estimativa reduzida ao que o acréscimo aproveita: **os
 * itens**.
 *
 * É deliberadamente estrutural e menor que o que as actions devolvem,
 * e é isso que dispensa adaptador: `estimarPorDescricaoAction` e
 * `estimarRefeicaoAction` entram aqui como são, e o `nome` que ambas
 * propõem fica de fora por não ser lido — quem fotografa um pão de
 * queijo enquanto edita o café da manhã acrescenta um item, não
 * rebatiza a refeição. Um wrapper por rota só para apagar esse campo
 * seria código cuja única função é repetir o que o tipo já diz.
 */
export type ResultadoComItens =
  | { ok: true; estimativa: { itens: ItemPrato[] } }
  | { ok: false; erro: string };

export type ResultadoTranscricaoAcrescimo =
  | { ok: true; transcricao: string; trechosIncertos: string[] }
  | { ok: false; erro: string };

type Modo = "texto" | "audio" | "foto";

const MODOS: readonly { id: Modo; rotulo: string; Icone: typeof PencilLine }[] = [
  { id: "texto", rotulo: "Escrever", Icone: PencilLine },
  { id: "audio", rotulo: "Falar", Icone: Mic },
  { id: "foto", rotulo: "Fotografar", Icone: Camera },
];

export function AcrescentarAlimento({
  dia,
  estimarDescricao,
  estimarFoto,
  transcrever,
  aoAcrescentar,
  aoFechar,
  className,
}: {
  dia: string;
  estimarDescricao: (fd: FormData) => Promise<ResultadoComItens>;
  estimarFoto?: (fd: FormData) => Promise<ResultadoComItens>;
  transcrever?: (fd: FormData) => Promise<ResultadoTranscricaoAcrescimo>;
  /** Recebe os itens estimados; quem chama decide como somá-los ao prato. */
  aoAcrescentar: (itens: ItemPrato[]) => void;
  aoFechar: () => void;
  className?: string;
}) {
  const [modo, setModo] = useState<Modo>("texto");
  const [descricao, setDescricao] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
  const [transcrito, setTranscrito] = useState(false);
  const [foto, setFoto] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const disponiveis = MODOS.filter(
    ({ id }) => (id !== "foto" || estimarFoto) && (id !== "audio" || transcrever),
  );

  function trocarModo(novo: Modo) {
    setModo(novo);
    setErro(null);
  }

  /**
   * A descrição escrita **permanece na tela** quando a estimativa
   * falha: perder o texto por indisponibilidade da IA custaria ao
   * atleta justamente o esforço que ele acabou de fazer.
   */
  function aplicar(resultado: ResultadoComItens) {
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    aoAcrescentar(resultado.estimativa.itens);
  }

  async function transcreverAudio() {
    if (!audio || !transcrever) return;
    setErro(null);
    setOcupado(true);
    try {
      const corpo = new FormData();
      corpo.set("audio", audio, "descricao-refeicao");
      const resultado = await transcrever(corpo);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      setDescricao(resultado.transcricao);
      setTranscrito(true);
    } catch {
      setErro("Falha de conexão durante o envio do áudio. Tente novamente.");
    } finally {
      setOcupado(false);
    }
  }

  async function estimarPorTexto() {
    setErro(null);
    setOcupado(true);
    try {
      const corpo = new FormData();
      corpo.set("descricao", descricao);
      corpo.set("dia", dia);
      corpo.set("origem", transcrito ? "audio" : "texto");
      aplicar(await estimarDescricao(corpo));
    } catch {
      setErro("Falha de conexão durante a estimativa. Sua descrição continua aqui.");
    } finally {
      setOcupado(false);
    }
  }

  async function estimarPorFoto() {
    if (!foto || !estimarFoto) return;
    setErro(null);
    setOcupado(true);
    try {
      const reduzida = await reduzirImagemParaEnvio(foto, { ladoMaximo: 1280, qualidade: 0.8 });
      const corpo = new FormData();
      corpo.set("foto", reduzida, reduzida.name);
      corpo.set("dia", dia);
      aplicar(await estimarFoto(corpo));
    } catch {
      setErro("Falha de conexão durante o envio da foto. Tente novamente.");
    } finally {
      setOcupado(false);
    }
  }

  const precisaTranscrever = modo === "audio" && !transcrito;
  const podeEstimarTexto = descricao.trim().length >= 3;

  return (
    <section
      aria-label="Acrescentar alimento"
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border-strong bg-surface-container p-3",
        className,
      )}
    >
      <div className="flex gap-2" role="group" aria-label="Como acrescentar o alimento">
        {disponiveis.map(({ id, rotulo, Icone }) => (
          <Button
            key={id}
            type="button"
            variant={modo === id ? "default" : "outline"}
            aria-pressed={modo === id}
            className="flex-1"
            onClick={() => trocarModo(id)}
          >
            <Icone className="size-4" aria-hidden="true" /> {rotulo}
          </Button>
        ))}
      </div>

      {modo === "audio" && !transcrito ? (
        <CapturaAudio
          audio={audio}
          aoGravar={(gravado) => {
            setAudio(gravado);
            setErro(null);
          }}
          dica="Diga só o que faltou: “um pão de queijo e um café com leite”."
        />
      ) : null}

      {modo === "foto" ? (
        <CapturaFoto
          arquivo={foto}
          aoEscolher={(escolhida) => {
            setFoto(escolhida);
            setErro(null);
          }}
          rotuloCaptura="Fotografar o alimento"
          dica="Fotografe só o que faltou. Um talher ou a mão ao lado ajudam a estimar a porção."
        />
      ) : null}

      {modo === "texto" || transcrito ? (
        <label className="flex flex-col gap-2">
          <span className="text-label-md text-muted-foreground">
            {transcrito ? "Confira a transcrição antes de estimar" : "O que faltou?"}
          </span>
          <Textarea
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value.slice(0, LIMITE_DESCRICAO))}
            rows={3}
            aria-label={transcrito ? "Transcrição do áudio" : "O que faltou"}
            placeholder="Um pão de queijo, um café com leite…"
          />
        </label>
      ) : null}

      {erro ? (
        <p role="alert" className="flex gap-2 text-body-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {erro}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={aoFechar}>
          Cancelar
        </Button>
        {precisaTranscrever ? (
          <Button
            type="button"
            className="flex-1"
            onClick={transcreverAudio}
            disabled={!audio || ocupado}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {ocupado ? "Ouvindo…" : "Transcrever"}
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1"
            onClick={modo === "foto" ? estimarPorFoto : estimarPorTexto}
            disabled={ocupado || (modo === "foto" ? !foto : !podeEstimarTexto)}
          >
            <Plus className="size-4" aria-hidden="true" />
            {ocupado ? "Estimando…" : "Acrescentar ao prato"}
          </Button>
        )}
      </div>

      <p className="text-caption leading-relaxed text-muted-foreground">
        O que você acrescentar entra como estimativa e continua editável antes de registrar.
      </p>
    </section>
  );
}
