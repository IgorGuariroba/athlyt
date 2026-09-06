"use client";

import { TimerReset } from "lucide-react";
import { SeletorSegmentado } from "@/components/tela";
import { opcoesDescanso, type RitmoDescanso } from "@/domain/sessao/descanso";
import { definirRitmoDescanso, useRitmoDescanso } from "@/lib/store-descanso";

/**
 * Escolha do descanso entre séries, dentro do exercício.
 *
 * Três opções derivadas da prescrição, e não um campo livre: entre
 * séries o atleta decide "menos / como está / mais", não "97
 * segundos". O rótulo é a duração, para que a escolha não dependa de
 * o atleta saber o que "curto" significa neste exercício.
 *
 * A escolha vale para o próximo timer aberto — o timer em contagem não
 * é reajustado no meio, porque isso mudaria o número que o atleta está
 * olhando; para o descanso em curso existem os botões ±15s.
 */
export function AjusteDescanso({ exercicioId, descansoPrescritoSeg }: {
  exercicioId: string;
  descansoPrescritoSeg: number;
}) {
  const ritmo = useRitmoDescanso(exercicioId);
  const opcoes = opcoesDescanso(descansoPrescritoSeg);
  const escolhida = opcoes.find((opcao) => opcao.ritmo === ritmo) ?? opcoes[1] ?? opcoes[0];
  if (!escolhida) return null;

  function escolher(novo: RitmoDescanso) {
    definirRitmoDescanso(exercicioId, novo);
  }

  return (
    <section aria-label="Descanso entre séries" className="border-b border-border px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-caption font-semibold tracking-wide text-muted-foreground uppercase">
          <TimerReset className="size-3.5" aria-hidden /> Descanso entre séries
        </p>
        <p aria-live="polite" className="text-caption text-muted-foreground">
          {escolhida.descricao}
        </p>
      </div>
      <SeletorSegmentado
        rotulo="Descanso entre séries"
        name={`descanso-${exercicioId}`}
        valor={ritmo}
        opcoes={opcoes.map((opcao) => ({
          valor: opcao.ritmo,
          rotulo: opcao.rotulo,
          descricao: opcao.descricao,
        }))}
        aoMudar={escolher}
      />
    </section>
  );
}
