"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, ChevronDown, Minus, Plus, TimerReset, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { segundosDeDescanso } from "@/domain/sessao/descanso";
import { MARCA_ZERO, avaliarRecorde, estimativaRm, type MarcaExercicio } from "@/domain/sessao/recorde";
import { useRitmoDescanso } from "@/lib/store-descanso";
import { atualizarRascunhoSerie, removerRascunhoSerie, useRascunhoSerie } from "@/lib/store-rascunho-serie";
import { useConexao } from "./estado-conexao";

const FECHAR_TIMERS_DE_DESCANSO = "athlyt:fechar-timers-de-descanso";

export function RegistroSerie({ sessionId, exercicioId, numero, repeticoesSugeridas, rirInicial, rirSugerido, descansoSeg, concluida, cargaInicial, cargaSugerida, melhorCargaAnterior, marcaAnterior, repeticoesIniciais, modo, seriesDoExercicio }: {
  sessionId: string; exercicioId: string; numero: number; repeticoesSugeridas: string; rirInicial: number; rirSugerido: number;
  descansoSeg: number; concluida: boolean; cargaInicial: number | null; cargaSugerida: number; melhorCargaAnterior: number; repeticoesIniciais: number | null;
  /**
   * Melhor marca do mesmo exercício antes desta série — histórico do
   * atleta mais as séries já feitas hoje. É contra ela que o recorde é
   * avaliado; sem ela, não há recorde a anunciar.
   */
  marcaAnterior?: MarcaExercicio;
  modo?: "repeticoes" | "tempo" | "distancia" | "duracao" | "calorias" | "ritmo" | "unilateral" | "circuito";
  /**
   * Número e estado (do servidor) de todas as séries do exercício, na
   * ordem em que aparecem na tela. Usado só para decidir se esta é a
   * última série já registrada — o selo de recorde não deve conviver
   * com o de uma série posterior, que é quem de fato vale agora.
   */
  seriesDoExercicio?: Array<{ numero: number; concluida: boolean }>;
}) {
  const modoEfetivo = modo ?? "repeticoes";
  const rotulos = { repeticoes: "REPS", tempo: "TEMPO (S)", distancia: "DISTÂNCIA (M)", duracao: "DURAÇÃO (MIN)", calorias: "CALORIAS", ritmo: "RITMO", unilateral: "LADOS", circuito: "RODADAS" } as const;
  const [restante, setRestante] = useState<number | null>(null);
  const [timerMinimizado, setTimerMinimizado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroRegistro, setErroRegistro] = useState<string | null>(null);
  const { registrar: enfileirarEvento, registrosLocais } = useConexao();
  // O descanso que vale é o escolhido para este exercício; sem escolha,
  // o prescrito pelo plano.
  const ritmoDescanso = useRitmoDescanso(exercicioId);
  const descansoEfetivoSeg = segundosDeDescanso(descansoSeg, ritmoDescanso);
  const local = registrosLocais.find((r) => r.exercicioId === exercicioId && r.numero === numero);
  const registrada = concluida || local !== undefined;
  // Uma série só está "registrada" aqui via `concluida` (vindo do servidor) ou via
  // `registrosLocais` (recém enviada, ainda não refletida no HTML). Combinar as
  // duas fontes por número deixa dizer, sem esperar o refresh do servidor, se
  // existe alguma série posterior já registrada — e por isso o selo desta é
  // obsoleto.
  const existeSerieRegistradaDepois = (seriesDoExercicio ?? []).some((serie) => {
    if (serie.numero <= numero) return false;
    const registradaLa = serie.concluida || registrosLocais.some((r) => r.exercicioId === exercicioId && r.numero === serie.numero);
    return registradaLa;
  });
  const carga = local?.cargaKg ?? cargaInicial;
  const reps = local?.repeticoes ?? repeticoesIniciais;
  const rascunho = useRascunhoSerie(sessionId, exercicioId, numero);
  const cargaExibida = local ? String(local.cargaKg) : rascunho?.cargaKg ?? (carga === null ? "" : String(carga));
  const repeticoesExibidas = local ? String(local.repeticoes) : rascunho?.repeticoes ?? String(reps ?? Number.parseInt(repeticoesSugeridas));
  const rirExibido = local ? String(local.rir) : rascunho?.rir ?? String(rirInicial);

  useEffect(() => {
    const fechar = () => setRestante(null);
    window.addEventListener(FECHAR_TIMERS_DE_DESCANSO, fechar);
    return () => window.removeEventListener(FECHAR_TIMERS_DE_DESCANSO, fechar);
  }, []);

  useEffect(() => {
    if (restante === null) return;
    const id = window.setTimeout(() => setRestante((valor) => {
      if (valor === null) return null;
      if (valor <= 1) {
        navigator.vibrate?.([180, 80, 180]);
        if (Notification.permission === "granted") new Notification("Descanso concluído", { body: "Sua próxima série está pronta." });
        // O descanso concluído não mantém uma camada modal em 0:00
        // bloqueando o registro da próxima série.
        return null;
      }
      return valor - 1;
    }), 1000);
    return () => window.clearTimeout(id);
  }, [restante]);

  /**
   * Offline-first sem exceção: a série entra primeiro na fila local e
   * só depois tenta ir para o servidor. Registrar direto no servidor e
   * cair para a fila no `catch` é tentador, mas deixa uma janela em
   * que o app não sabe se o evento existe — e o timer, que é a razão
   * de o atleta olhar a tela, ficaria esperando a rede.
   */
  function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formData = new FormData(evento.currentTarget);
    setEnviando(true);
    setErroRegistro(null);
    // Há um RegistroSerie montado para cada série. Antes de abrir este
    // timer, fecha qualquer timer iniciado por outra série para garantir
    // uma única camada modal e uma única contagem de descanso na sessão.
    window.dispatchEvent(new Event(FECHAR_TIMERS_DE_DESCANSO));
    // O timer começa fora de uma React Form Action: Actions retêm as
    // atualizações de estado até a Promise terminar, o que faria o descanso
    // aguardar a sincronização da série e a preparação do Copiloto.
    setRestante(descansoEfetivoSeg);
    setTimerMinimizado(false);

    const promessa = enfileirarEvento("serie_registrada", {
      exercicioId, numero,
      cargaKg: Number(formData.get("cargaKg")),
      repeticoes: Number(formData.get("repeticoes")),
      rir: Number(formData.get("rir")),
    });
    void promessa.then(
      () => {
        removerRascunhoSerie(sessionId, exercicioId, numero);
        setEnviando(false);
      },
      () => {
        setEnviando(false);
        setErroRegistro("A série não foi salva. Confira os dados e tente novamente.");
      },
    );
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }

  /**
   * Recorde compara esta série ao histórico do mesmo exercício em
   * intensidade, carga e volume. A regra antiga olhava só o peso, e
   * por isso marcava recorde em toda série com a mesma carga — 60 kg
   * × 5 aparecia como recorde depois de 60 kg × 9.
   */
  const referencia = marcaAnterior
    ?? (melhorCargaAnterior > 0 ? { ...MARCA_ZERO, cargaKg: melhorCargaAnterior } : MARCA_ZERO);
  // O recorde vale como conquista da sessão — só a marca mais recente
  // deve ostentar o selo. Senão duas séries mostram "Novo recorde" ao
  // mesmo tempo, e a mais antiga já foi superada pela própria sessão.
  const recorde = registrada && !existeSerieRegistradaDepois
    ? avaliarRecorde({ cargaKg: carga, repeticoes: reps }, referencia)
    : null;
  const estimativa10Rm = registrada && carga && reps ? estimativaRm(carga, reps, 10) : null;

  return (
    <>
      <form onSubmit={registrar} className="grid grid-cols-[2rem_1fr_1fr_4rem_3rem] items-end gap-2 py-3">
        <span className="mb-3 flex size-8 items-center justify-center rounded-full bg-surface-container-high text-label-lg font-bold">{registrada ? <Check className="size-4 text-success" /> : numero}</span>
        <input type="hidden" name="exercicioId" value={exercicioId} />
        <input type="hidden" name="numero" value={numero} />
        {modoEfetivo !== "repeticoes" && modoEfetivo !== "unilateral" ? (
          <input type="hidden" name="cargaKg" value="0" />
        ) : (
          <label className="text-caption text-muted-foreground">KG
            <Input name="cargaKg" type="number" inputMode="decimal" step="0.5" min="0" value={cargaExibida} onChange={(evento) => atualizarRascunhoSerie(sessionId, exercicioId, numero, "cargaKg", evento.target.value)} placeholder={String(cargaSugerida)} required disabled={registrada} className="mt-1 h-12 text-center text-lg font-bold tabular-nums" />
          </label>
        )}
        <label className="text-caption text-muted-foreground">{rotulos[modoEfetivo]} <span className="sr-only">sugeridas {repeticoesSugeridas}</span>
          <Input name="repeticoes" type="number" inputMode="numeric" min="0" value={repeticoesExibidas} onChange={(evento) => atualizarRascunhoSerie(sessionId, exercicioId, numero, "repeticoes", evento.target.value)} required disabled={registrada} className="mt-1 h-12 text-center text-lg font-bold tabular-nums" />
        </label>
        {modoEfetivo === "repeticoes" || modoEfetivo === "unilateral" ? <label className="text-caption text-muted-foreground">RIR <span className="sr-only">prescrito {rirSugerido}</span>
          <Input name="rir" type="number" inputMode="numeric" min="0" max="10" value={rirExibido} onChange={(evento) => atualizarRascunhoSerie(sessionId, exercicioId, numero, "rir", evento.target.value)} required disabled={registrada} className="mt-1 h-12 text-center text-lg font-bold tabular-nums" />
        </label> : <input type="hidden" name="rir" value="0" />}
        <Button type="submit" size="icon" disabled={enviando || registrada} aria-label={`Registrar série ${numero}`} className="mb-0 size-12 rounded-full">
          <Check className="size-5" />
        </Button>
        {registrada ? <div className="col-span-5 flex items-center justify-between pl-10 text-caption text-muted-foreground"><span>10RM estimado: {estimativa10Rm ?? "—"} kg</span>{recorde ? <strong className="flex items-center gap-1 text-warning"><Trophy className="size-3" /> {recorde.rotulo}</strong> : null}</div> : null}
      </form>
      {erroRegistro ? <p role="alert" className="pb-3 pl-10 text-body-sm font-semibold text-error">{erroRegistro}</p> : null}

      {/*
        * O descanso é a razão de o atleta olhar a tela entre séries, então
        * nem o timer aberto nem o minimizado podem ficar sob a `BottomNav`.
        *
        * Geometria: a nav flutua entre `1rem` e `1rem + 4.125rem` acima de
        * `--safe-bottom` (`src/components/navigation/bottom-nav.tsx`), e o
        * casco reserva `5.25rem` para ela (`src/app/(app)/layout.tsx`). O
        * `7rem` do pill é essa reserva mais uma folga, medida a partir da
        * mesma origem — por isso soma `--safe-bottom`, e não um valor fixo.
        *
        * Camada: a nav é `z-10` e o menu do kit é `z-50`. Como o descanso
        * deve permanecer visível sobre a sessão, o pill fica acima de ambos
        * (`z-[60]`) e o modal bloqueante ocupa a camada seguinte (`z-[70]`).
      */}
      {restante !== null && timerMinimizado ? <button type="button" onClick={() => setTimerMinimizado(false)} className="fixed right-4 bottom-[calc(7rem+var(--safe-bottom))] z-[60] flex h-14 items-center gap-2 rounded-full bg-success px-5 font-bold text-background shadow-xl"><TimerReset className="size-5" /> {Math.floor(Math.max(restante, 0) / 60)}:{String(Math.max(restante, 0) % 60).padStart(2, "0")}</button> : null}
      {restante !== null && !timerMinimizado ? (
        <div role="dialog" aria-label="Timer de descanso" className="fixed inset-0 z-[70] flex items-end bg-black/60 backdrop-blur-sm">
          <section className="w-full rounded-t-2xl border-t border-border bg-surface-container p-6 pb-8 text-center">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-label-lg text-muted-foreground"><TimerReset className="size-5" /> Descanso</div>
              <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => setTimerMinimizado(true)} aria-label="Minimizar timer"><ChevronDown /></Button><Button variant="ghost" size="icon" onClick={() => setRestante(null)} aria-label="Fechar timer"><X /></Button></div>
            </div>
            <p aria-live="polite" className="mb-6 text-[4.5rem] leading-none font-bold tracking-tight tabular-nums text-on-surface-strong">{Math.floor(Math.max(restante, 0) / 60)}:{String(Math.max(restante, 0) % 60).padStart(2, "0")}</p>
            <div className="mb-6 flex justify-center gap-3">
              <Button variant="secondary" size="lg" onClick={() => setRestante(Math.max(0, restante - 15))}><Minus />15s</Button>
              <Button variant="secondary" size="lg" onClick={() => setRestante(restante + 15)}><Plus />15s</Button>
            </div>
            <Button size="lg" className="h-14 w-full text-base font-bold" onClick={() => setRestante(null)}>Pular descanso</Button>
          </section>
        </div>
      ) : null}
    </>
  );
}
