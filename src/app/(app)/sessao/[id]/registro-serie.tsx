"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Minus, Plus, TimerReset, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConexao } from "./estado-conexao";

export function RegistroSerie({ exercicioId, numero, repeticoesSugeridas, rirSugerido, descansoSeg, concluida, cargaInicial, cargaSugerida, melhorCargaAnterior, repeticoesIniciais }: {
  exercicioId: string; numero: number; repeticoesSugeridas: string; rirSugerido: number;
  descansoSeg: number; concluida: boolean; cargaInicial: number | null; cargaSugerida: number; melhorCargaAnterior: number; repeticoesIniciais: number | null;
}) {
  const [restante, setRestante] = useState<number | null>(null);
  const [timerMinimizado, setTimerMinimizado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const { registrar: enfileirarEvento, registrosLocais } = useConexao();
  const local = registrosLocais.find((r) => r.exercicioId === exercicioId && r.numero === numero);
  const registrada = concluida || local !== undefined;
  const carga = local?.cargaKg ?? cargaInicial;
  const reps = local?.repeticoes ?? repeticoesIniciais;

  useEffect(() => {
    if (restante === null) return;
    if (restante <= 0) {
      navigator.vibrate?.([180, 80, 180]);
      if (Notification.permission === "granted") new Notification("Descanso concluído", { body: "Sua próxima série está pronta." });
      return;
    }
    const id = window.setTimeout(() => setRestante((valor) => valor === null ? null : valor - 1), 1000);
    return () => window.clearTimeout(id);
  }, [restante]);

  /**
   * Offline-first sem exceção: a série entra primeiro na fila local e
   * só depois tenta ir para o servidor. Registrar direto no servidor e
   * cair para a fila no `catch` é tentador, mas deixa uma janela em
   * que o app não sabe se o evento existe — e o timer, que é a razão
   * de o atleta olhar a tela, ficaria esperando a rede.
   */
  async function registrar(formData: FormData) {
    setEnviando(true);
    // O timer começa antes de qualquer ida à rede: o descanso é tempo
    // real do atleta e não pode depender de latenc̃ia.
    setRestante(descansoSeg);
    setTimerMinimizado(false);
    const promessa = enfileirarEvento("serie_registrada", {
      exercicioId, numero,
      cargaKg: Number(formData.get("cargaKg")),
      repeticoes: Number(formData.get("repeticoes")),
      rir: Number(formData.get("rir")),
    });
    if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission();
    await promessa;
    setEnviando(false);
  }

  const novoRecorde = registrada && (carga ?? 0) > melhorCargaAnterior;
  const estimativa10Rm = registrada && carga && reps
    ? Math.round((carga * (1 + reps / 30) / (1 + 10 / 30)) * 10) / 10
    : null;

  return (
    <>
      <form action={registrar} className={`grid grid-cols-[2rem_1fr_1fr_4rem_3rem] items-end gap-2 py-3 ${registrada ? "opacity-60" : ""}`}>
        <span className="mb-3 flex size-8 items-center justify-center rounded-full bg-surface-container-high text-label-lg font-bold">{registrada ? <Check className="size-4 text-success" /> : numero}</span>
        <input type="hidden" name="exercicioId" value={exercicioId} />
        <input type="hidden" name="numero" value={numero} />
        <label className="text-caption text-muted-foreground">KG
          <Input name="cargaKg" type="number" inputMode="decimal" step="0.5" min="0" defaultValue={carga ?? cargaSugerida} required disabled={registrada} className="mt-1 h-12 text-center text-lg font-bold tabular-nums" />
        </label>
        <label className="text-caption text-muted-foreground">REPS <span className="sr-only">sugeridas {repeticoesSugeridas}</span>
          <Input name="repeticoes" type="number" inputMode="numeric" min="0" defaultValue={reps ?? Number.parseInt(repeticoesSugeridas)} required disabled={registrada} className="mt-1 h-12 text-center text-lg font-bold tabular-nums" />
        </label>
        <label className="text-caption text-muted-foreground">RIR
          <Input name="rir" type="number" inputMode="numeric" min="0" max="10" defaultValue={local?.rir ?? rirSugerido} required disabled={registrada} className="mt-1 h-12 text-center text-lg font-bold tabular-nums" />
        </label>
        <Button type="submit" size="icon" disabled={enviando || registrada} aria-label={`Registrar série ${numero}`} className="mb-0 size-12 rounded-full">
          <Check className="size-5" />
        </Button>
        {registrada ? <div className="col-span-5 flex items-center justify-between pl-10 text-caption text-muted-foreground"><span>10RM estimado: {estimativa10Rm ?? "—"} kg</span>{novoRecorde ? <strong className="flex items-center gap-1 text-warning"><Trophy className="size-3" /> Novo recorde</strong> : null}</div> : null}
      </form>

      {restante !== null && timerMinimizado ? <button type="button" onClick={() => setTimerMinimizado(false)} className="fixed right-4 bottom-24 z-40 flex h-14 items-center gap-2 rounded-full bg-success px-5 font-bold text-background shadow-xl"><TimerReset className="size-5" /> {Math.floor(Math.max(restante, 0) / 60)}:{String(Math.max(restante, 0) % 60).padStart(2, "0")}</button> : null}
      {restante !== null && !timerMinimizado ? (
        <div role="dialog" aria-label="Timer de descanso" className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm">
          <section className="w-full rounded-t-3xl border-t border-border bg-surface-container p-6 pb-8 text-center">
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
