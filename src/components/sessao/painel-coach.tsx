"use client";

import { CircuitBoard, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { orientarExercicio } from "@/domain/sessao/coach-local";
import type { ExercicioSessao } from "@/domain/sessao/repositorio";
import { useConexao } from "./estado-conexao";

export function PainelCoach({ exercicio }: { exercicio: ExercicioSessao }) {
  const { estado, registrosLocais, copiloto, confirmarAlertaCautela } = useConexao();
  const [confirmando, setConfirmando] = useState(false);

  const comLocais: ExercicioSessao = {
    ...exercicio,
    series: exercicio.series.map((serie) => {
      const local = registrosLocais.find((r) => r.exercicioId === exercicio.exercicioId && r.numero === serie.numero);
      return local ? { ...serie, ...local, concluida: true } : serie;
    }),
  };

  if (estado === "offline" || estado === "degradado" || copiloto.estado === "local") {
    const orientacoes = orientarExercicio(comLocais);
    if (orientacoes.length === 0) return null;
    return (
      <section aria-label="Orientações do Coach Local" className="border-b border-border px-4 py-3">
        <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold tracking-wide text-muted-foreground uppercase">
          <CircuitBoard className="size-3.5" aria-hidden /> Coach Local (regra) · {orientacoes[0].versao}
        </p>
        <ul className="flex flex-col gap-2">
          {orientacoes.map((orientacao) => (
            <li key={orientacao.regra} className={`flex items-start gap-2 text-body-sm ${orientacao.severidade === "cautela" ? "text-warning" : "text-on-surface"}`}>
              {orientacao.severidade === "cautela" ? <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
              <span>{orientacao.mensagem} <span className="text-muted-foreground">— origem: {orientacao.origem}</span></span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-caption text-muted-foreground">
          {estado === "offline" ? "Sem rede" : "Copiloto indisponível"}: nenhuma sugestão de IA é gerada aqui.
        </p>
      </section>
    );
  }

  if (copiloto.estado === "consultando") {
    return (
      <section aria-label="Orientação do Copiloto" className="border-b border-border px-4 py-3 text-body-sm text-muted-foreground" aria-live="polite">
        Copiloto analisando a próxima série…
      </section>
    );
  }
  if (copiloto.estado !== "orientacao") return null;

  const { orientacao } = copiloto;
  const sugestoes = [
    orientacao.cargaSugeridaKg === null ? null : `${orientacao.cargaSugeridaKg} kg`,
    orientacao.repeticoesAlvo === null ? null : `${orientacao.repeticoesAlvo} reps`,
    orientacao.rirAlvo === null ? null : `RIR ${orientacao.rirAlvo}`,
    orientacao.descansoSegundos === null ? null : `${orientacao.descansoSegundos}s de descanso`,
  ].filter((item): item is string => item !== null);

  async function confirmar() {
    setConfirmando(true);
    try {
      await confirmarAlertaCautela(exercicio.exercicioId);
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <section aria-label="Orientação do Copiloto" className="border-b border-border px-4 py-3" aria-live="polite">
      <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold tracking-wide text-muted-foreground uppercase">
        <Sparkles className="size-3.5" aria-hidden /> Copiloto (IA) · {copiloto.versao}
      </p>
      {sugestoes.length > 0 ? <p className="text-label-lg font-semibold text-on-surface">{sugestoes.join(" · ")}</p> : null}
      <p className="mt-1 text-body-sm text-on-surface">{orientacao.justificativa}</p>
      {orientacao.alertaCautela ? (
        <div role="alert" className="mt-3 rounded-xl border border-warning/40 bg-surface-container-high p-3 text-body-sm text-warning">
          <p className="flex items-start gap-2 font-semibold"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> Alerta de Cautela</p>
          <p className="mt-1">{orientacao.alertaCautela}</p>
          {copiloto.alertaConfirmado ? (
            <p className="mt-2 font-semibold">Override registrado. Você decidiu continuar.</p>
          ) : (
            <Button type="button" variant="outline" size="sm" className="mt-3" disabled={confirmando} onClick={confirmar}>
              Continuar mesmo assim
            </Button>
          )}
        </div>
      ) : null}
    </section>
  );
}
