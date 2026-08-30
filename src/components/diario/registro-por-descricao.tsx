"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Mic, PencilLine, Sparkles, TriangleAlert } from "lucide-react";

import { AvisoAcao, CabecalhoSecao, EstadoVazio } from "@/components/tela";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LIMITE_DESCRICAO } from "@/domain/alimentos/audio-refeicao";
import { nomeDoItem, reestimarMacros, type ItemPrato } from "@/domain/alimentos/prato";
import type { Macros } from "@/domain/diario/tipos";
import { CapturaAudio } from "./captura-audio";
import { RevisaoEstimativa } from "./revisao-estimativa";

export type OrigemDescricao = "texto" | "audio";

export interface EstimativaDescrita {
  nome: string;
  itens: ItemPrato[];
  porcoesDescritas: string[];
  limitacoes: string[];
  confianca: "alta" | "media" | "baixa";
  descricaoUsada: string;
  origem: OrigemDescricao;
}

export interface ConsumoExistente {
  nome: string;
  macros: Macros;
}

export type ResultadoEstimativa =
  | { ok: true; estimativa: EstimativaDescrita }
  | { ok: false; erro: string };

export type ResultadoTranscricao =
  | { ok: true; transcricao: string; trechosIncertos: string[] }
  | { ok: false; erro: string };

export interface MacrosRecalculados {
  calorias: number;
  proteinaG: number;
  carboidratosG: number;
  gordurasG: number;
  fibrasG: number;
  confianca: "alta" | "media" | "baixa";
  modelo: string;
}

export type ResultadoMacrosItem =
  | { ok: true; macros: MacrosRecalculados }
  | { ok: false; erro: string };

export type ResultadoRegistro = { ok: true } | { ok: false; erro: string };

/**
 * Registro Retroativo por texto ou áudio (ADR 0002).
 *
 * O fluxo tem quatro estados e cada um existe por um motivo que a ADR
 * nomeia: **descrever → revisar a transcrição → revisar a estimativa →
 * confirmar**.
 *
 * A revisão da transcrição só aparece no caminho do áudio, e é o passo
 * que impede um "duzentos gramas" ouvido como "duzentos quilos" de
 * virar macro sem ninguém ver a frase. No caminho do texto ela seria
 * cerimônia: o atleta acabou de escrever o que está lendo.
 *
 * A confirmação nunca é implícita. Quando já existe Consumo Real para
 * aquela refeição, o botão passa por um aviso explícito de
 * substituição — cancelar ali preserva o registro anterior intacto
 * (user stories 21 e 22).
 */
export function RegistroPorDescricao({
  dia,
  horaInicial,
  nomeInicial,
  refeicaoRef,
  consumoExistente,
  categorias,
  estimar,
  transcrever,
  registrar,
  recalcularItem,
  rotaDoDiario = "/diario",
  className,
}: {
  dia: string;
  horaInicial: string;
  nomeInicial: string;
  /** Refeição Planejada de origem, quando o fluxo veio do cartão dela. */
  refeicaoRef?: string | null;
  /** Consumo já registrado para esta refeição; presença dispara o aviso. */
  consumoExistente?: ConsumoExistente | null;
  categorias: readonly string[];
  estimar: (fd: FormData) => Promise<ResultadoEstimativa>;
  transcrever: (fd: FormData) => Promise<ResultadoTranscricao>;
  registrar: (fd: FormData) => Promise<ResultadoRegistro>;
  /** Recalcula os macros de um item cujo alimento o atleta corrigiu. */
  recalcularItem?: (fd: FormData) => Promise<ResultadoMacrosItem>;
  /** Para onde voltar depois de gravar; o dia escolhido entra na query. */
  rotaDoDiario?: string;
  className?: string;
}) {
  const router = useRouter();
  const [modo, setModo] = useState<OrigemDescricao>("texto");
  const [descricao, setDescricao] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
  const [transcrito, setTranscrito] = useState(false);
  const [trechosIncertos, setTrechosIncertos] = useState<string[]>([]);
  const [estimativa, setEstimativa] = useState<EstimativaDescrita | null>(null);
  const [itens, setItens] = useState<ItemPrato[]>([]);
  /**
   * Nome de cada item no momento em que seus macros foram estimados.
   * Guardado à parte porque a lista é editada livremente: é a
   * comparação entre os dois que revela um alimento trocado sem os
   * números correspondentes.
   */
  const [nomesEstimados, setNomesEstimados] = useState<string[]>([]);
  const [nome, setNome] = useState(nomeInicial);
  const [diaEscolhido, setDiaEscolhido] = useState(dia);
  const [hora, setHora] = useState(horaInicial);
  const [confirmandoSubstituicao, setConfirmandoSubstituicao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [registrando, iniciarRegistro] = useTransition();

  async function transcreverAudio() {
    if (!audio) return;
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
      setTrechosIncertos(resultado.trechosIncertos);
      setTranscrito(true);
    } catch {
      setErro("Falha de conexão durante o envio do áudio. Tente novamente.");
    } finally {
      setOcupado(false);
    }
  }

  async function estimarDescricao() {
    setErro(null);
    setOcupado(true);
    try {
      const corpo = new FormData();
      corpo.set("descricao", descricao);
      corpo.set("dia", diaEscolhido);
      corpo.set("origem", modo);
      const resultado = await estimar(corpo);
      if (!resultado.ok) {
        // A descrição permanece na tela: perder o texto por falha da IA
        // custaria ao atleta justamente o esforço que ele já fez.
        setErro(resultado.erro);
        return;
      }
      setEstimativa(resultado.estimativa);
      setItens(resultado.estimativa.itens);
      setNomesEstimados(resultado.estimativa.itens.map(nomeDoItem));
      setNome(resultado.estimativa.nome);
    } catch {
      setErro("Falha de conexão durante a estimativa. Sua descrição continua aqui.");
    } finally {
      setOcupado(false);
    }
  }

  /**
   * A lista de nomes estimados acompanha a de itens por posição, e a
   * revisão permite remover e acrescentar. Realinhar aqui, num único
   * ponto, evita a classe de bug em que o aviso passa a apontar para o
   * item vizinho depois de uma remoção.
   *
   * Item acrescentado à mão entra com o próprio nome: ele nunca está
   * defasado, porque quem informou os macros foi o atleta.
   */
  function aoMudarItens(novos: ItemPrato[]) {
    if (novos.length !== itens.length) {
      const anteriores = new Map(itens.map((item, indice) => [item, nomesEstimados[indice]]));
      setNomesEstimados(novos.map((item) => anteriores.get(item) ?? nomeDoItem(item)));
    }
    setItens(novos);
  }

  async function recalcular(indice: number) {
    if (!recalcularItem) return;
    const item = itens[indice];
    if (!item) return;
    setErro(null);

    const corpo = new FormData();
    corpo.set("alimento", nomeDoItem(item));
    corpo.set("gramas", String(item.quantidade));
    try {
      const resultado = await recalcularItem(corpo);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      // Os números passam a valer para o nome atual, então o aviso desta
      // linha some — e só o desta.
      setItens((atuais) =>
        atuais.map((alvo, i) => (i === indice ? reestimarMacros(alvo, resultado.macros) : alvo)),
      );
      setNomesEstimados((atuais) =>
        atuais.map((alvo, i) => (i === indice ? nomeDoItem(item) : alvo)),
      );
    } catch {
      setErro("Falha de conexão ao recalcular. Os números continuam como estavam.");
    }
  }

  function confirmar() {
    setErro(null);
    const corpo = new FormData();
    corpo.set("dia", diaEscolhido);
    corpo.set("hora", hora);
    corpo.set("nome", nome);
    corpo.set("origem", modo);
    corpo.set("itens", JSON.stringify(itens));
    // A substituição não é um campo do envio: ela é consequência de
    // gravar com o mesmo `refeicaoRef` no mesmo dia. Mandar um sinal
    // à parte criaria uma segunda verdade sobre o mesmo fato.
    if (refeicaoRef) corpo.set("refeicaoRef", refeicaoRef);
    iniciarRegistro(async () => {
      const resultado = await registrar(corpo);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      // A volta ao Diário acontece aqui, e não por `redirect` na
      // server action: a action devolve erro tratável na tela, e uma
      // action que redireciona não consegue fazer as duas coisas.
      router.push(`${rotaDoDiario}?dia=${diaEscolhido}`);
      router.refresh();
    });
  }

  if (!estimativa) {
    const precisaTranscrever = modo === "audio" && !transcrito;
    return (
      <div className={className}>
        <div className="flex flex-col gap-5">
          <div className="flex gap-2" role="group" aria-label="Como descrever a refeição">
            <Button
              type="button"
              variant={modo === "texto" ? "default" : "outline"}
              aria-pressed={modo === "texto"}
              className="flex-1"
              onClick={() => {
                setModo("texto");
                setErro(null);
              }}
            >
              <PencilLine className="size-4" aria-hidden="true" /> Escrever
            </Button>
            <Button
              type="button"
              variant={modo === "audio" ? "default" : "outline"}
              aria-pressed={modo === "audio"}
              className="flex-1"
              onClick={() => {
                setModo("audio");
                setErro(null);
              }}
            >
              <Mic className="size-4" aria-hidden="true" /> Falar
            </Button>
          </div>

          {modo === "audio" && !transcrito ? (
            <CapturaAudio
              audio={audio}
              aoGravar={(gravado) => {
                setAudio(gravado);
                setErro(null);
              }}
              dica="Diga o que comeu e as porções como você lembra: “dois ovos, um pão francês e um copo de leite”."
            />
          ) : null}

          {modo === "texto" || transcrito ? (
            <label className="flex flex-col gap-2">
              <span className="text-label-md text-muted-foreground">
                {transcrito
                  ? "Confira a transcrição antes de estimar"
                  : "O que você comeu?"}
              </span>
              <Textarea
                value={descricao}
                onChange={(evento) => setDescricao(evento.target.value.slice(0, LIMITE_DESCRICAO))}
                rows={5}
                aria-label={transcrito ? "Transcrição do áudio" : "Descrição da refeição"}
                placeholder="Duas colheres de arroz, um bife médio, salada de tomate com um fio de azeite…"
              />
              <span className="text-caption tabular-nums text-muted-foreground">
                {descricao.trim().length}/{LIMITE_DESCRICAO}
              </span>
            </label>
          ) : null}

          {transcrito && trechosIncertos.length > 0 ? (
            <div className="flex gap-3 rounded-xl border border-border bg-surface-container px-4 py-3">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <p className="text-label-md text-on-surface-strong">
                  Trechos que podem ter sido entendidos errado
                </p>
                <ul className="flex flex-col gap-0.5 text-body-sm text-muted-foreground">
                  {trechosIncertos.map((trecho) => (
                    <li key={trecho}>{trecho}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {erro ? <AvisoAcao tipo="erro">{erro}</AvisoAcao> : null}

          {precisaTranscrever ? (
            <Button
              size="cta"
              className="w-full"
              onClick={transcreverAudio}
              disabled={!audio || ocupado}
            >
              <Sparkles className="size-5" aria-hidden="true" />
              {ocupado ? "Ouvindo o áudio…" : "Transcrever o áudio"}
            </Button>
          ) : (
            <Button
              size="cta"
              className="w-full"
              onClick={estimarDescricao}
              disabled={descricao.trim().length < 3 || ocupado}
            >
              <Sparkles className="size-5" aria-hidden="true" />
              {ocupado ? "Estimando…" : "Estimar calorias e macros"}
            </Button>
          )}

          <p className="text-body-sm leading-relaxed text-muted-foreground">
            {modo === "audio"
              ? "A gravação vai ao provedor de IA apenas para a transcrição e não é armazenada. Nada entra no Diário antes de você confirmar."
              : "Sua descrição vai ao provedor de IA apenas para esta estimativa. Nada entra no Diário antes de você confirmar."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-5">
        <CabecalhoSecao
          titulo="Confira antes de registrar"
          descricao="Ajuste o que estiver fora — o total acompanha suas correções."
        />

        {itens.length === 0 ? (
          <EstadoVazio
            titulo="Nenhum alimento sobrou"
            descricao="Você removeu todos os itens. Descreva de novo ou volte ao Diário."
            acao={
              <Button variant="ghost" onClick={() => setEstimativa(null)}>
                Descrever de novo
              </Button>
            }
          />
        ) : (
          <RevisaoEstimativa
            itens={itens}
            aoMudar={aoMudarItens}
            porcoesDescritas={estimativa.porcoesDescritas}
            nomesEstimados={nomesEstimados}
            aoRecalcularItem={recalcularItem ? recalcular : undefined}
            limitacoes={estimativa.limitacoes}
            confianca={estimativa.confianca}
            origemEstimativa={estimativa.origem}
          />
        )}

        {/* A descrição usada fica visível junto do resultado: é o que
            torna a estimativa auditável meses depois (user story 17). */}
        <details className="rounded-xl border border-border bg-surface-container px-4 py-3">
          <summary className="text-label-md text-on-surface-strong">
            {estimativa.origem === "audio"
              ? "Transcrição usada nesta estimativa"
              : "Descrição usada nesta estimativa"}
          </summary>
          <p className="mt-2 text-body-sm leading-relaxed text-muted-foreground">
            {estimativa.descricaoUsada}
          </p>
        </details>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2">
            <span className="text-label-md text-muted-foreground">Nome da refeição</span>
            <Input
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              aria-label="Nome da refeição"
              list="categorias-de-refeicao"
              className="h-12"
            />
            <datalist id="categorias-de-refeicao">
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria} />
              ))}
            </datalist>
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-2">
              <span className="text-label-md text-muted-foreground">Dia</span>
              <Input
                type="date"
                value={diaEscolhido}
                onChange={(evento) => setDiaEscolhido(evento.target.value)}
                aria-label="Dia da refeição"
                className="h-12"
              />
            </label>
            <label className="flex flex-1 flex-col gap-2">
              <span className="text-label-md text-muted-foreground">Horário</span>
              <Input
                type="time"
                value={hora}
                onChange={(evento) => setHora(evento.target.value)}
                aria-label="Horário da refeição"
                className="h-12"
              />
            </label>
          </div>
        </div>

        {erro ? <AvisoAcao tipo="erro">{erro}</AvisoAcao> : null}

        {consumoExistente && confirmandoSubstituicao ? (
          <div
            role="alertdialog"
            aria-label="Substituir o registro atual"
            className="flex flex-col gap-3 rounded-xl border border-warning/50 bg-surface-container px-4 py-3"
          >
            <p className="text-label-lg text-on-surface-strong">
              Isto substitui o registro atual
            </p>
            <p className="text-body-sm leading-relaxed text-muted-foreground">
              Você já registrou {consumoExistente.nome} com{" "}
              {consumoExistente.macros.calorias} kcal neste dia. Confirmar troca aquele
              registro por este; a refeição planejada continua guardada como referência.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setConfirmandoSubstituicao(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={confirmar}
                disabled={registrando}
              >
                <Check className="size-4" aria-hidden="true" />
                {registrando ? "Substituindo…" : "Substituir"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              size="cta"
              type="button"
              disabled={itens.length === 0 || registrando}
              onClick={() => {
                if (consumoExistente) {
                  setConfirmandoSubstituicao(true);
                  return;
                }
                confirmar();
              }}
            >
              <Check className="size-5" aria-hidden="true" />
              {registrando ? "Registrando…" : "Registrar no Diário"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEstimativa(null)}>
              Descrever de novo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
