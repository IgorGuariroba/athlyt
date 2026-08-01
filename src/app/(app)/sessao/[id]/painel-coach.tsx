"use client";

import { CircuitBoard, TriangleAlert } from "lucide-react";
import { orientarExercicio } from "@/domain/sessao/coach-local";
import type { ExercicioSessao } from "@/domain/sessao/repositorio";
import { useConexao } from "./estado-conexao";

/**
 * Coach Local na tela (user story 37; tela 042).
 *
 * As orientações são calculadas no cliente sobre o estado local — o
 * que inclui as séries que ainda estão na fila. Sem isso, a orientação
 * offline ficaria congelada no último HTML que veio do servidor,
 * justamente quando ela é a única disponível.
 *
 * Toda orientação carrega origem e versão da regra. Offline nada
 * simula IA: se o Copiloto de Sessão não pode responder, a tela diz
 * isso em vez de improvisar.
 */
export function PainelCoach({ exercicio }: { exercicio: ExercicioSessao }) {
  const { estado, registrosLocais } = useConexao();

  const comLocais: ExercicioSessao = {
    ...exercicio,
    series: exercicio.series.map((serie) => {
      const local = registrosLocais.find((r) => r.exercicioId === exercicio.exercicioId && r.numero === serie.numero);
      return local ? { ...serie, ...local, concluida: true } : serie;
    }),
  };
  const orientacoes = orientarExercicio(comLocais);
  if (orientacoes.length === 0) return null;

  return (
    <section aria-label="Orientações do Coach Local" className="border-b border-border px-4 py-3">
      <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold tracking-wide text-muted-foreground uppercase">
        <CircuitBoard className="size-3.5" aria-hidden /> Coach Local · {orientacoes[0].versao}
      </p>
      <ul className="flex flex-col gap-2">
        {orientacoes.map((orientacao) => (
          <li key={orientacao.regra} className={`flex items-start gap-2 text-body-sm ${orientacao.severidade === "cautela" ? "text-warning" : "text-on-surface"}`}>
            {orientacao.severidade === "cautela" ? <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
            <span>
              {orientacao.mensagem}{" "}
              <span className="text-muted-foreground">— origem: {orientacao.origem}</span>
            </span>
          </li>
        ))}
      </ul>
      {estado === "offline" ? (
        <p className="mt-2 text-caption text-muted-foreground">
          Sem rede: o Copiloto de Sessão está indisponível e nenhuma sugestão de IA é gerada aqui.
        </p>
      ) : null}
    </section>
  );
}
