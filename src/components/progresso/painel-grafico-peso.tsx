"use client";

import { useState } from "react";

import type { HorizonteDias, MedicaoPeso } from "@/domain/medicoes/plano-peso";
import { cn } from "@/lib/utils";
import { GraficoPeso } from "./grafico-peso";
import { SeletorHorizonte } from "./seletor-horizonte";

/**
 * Junta o filtro de período ao gráfico que ele recorta.
 *
 * Existe porque os dois são irmãos na tela — o seletor fica acima do
 * cartão, não dentro dele — e mesmo assim precisam compartilhar o
 * horizonte escolhido. A página do Progresso é um Server Component e
 * não pode segurar esse estado.
 *
 * O horizonte mora em `useState`, não na URL: é preferência de
 * visualização efêmera. Levá-lo à URL encheria o histórico do
 * navegador de passos que o atleta não pediu e custaria uma ida ao
 * servidor a cada toque — o mesmo motivo que faz `SeletorSegmentado`
 * existir separado de `ControleSegmentado`.
 *
 * Sem nenhum peso registrado o seletor não é montado: um controle que
 * não recorta nada é um botão morto, e disputaria atenção com a única
 * ação útil no estado vazio, que é registrar o primeiro peso.
 */
export function PainelGraficoPeso({
  medicoes,
  pesoMetaKg,
  horizonteInicial = 30,
  agora,
  className,
}: {
  medicoes: readonly MedicaoPeso[];
  pesoMetaKg?: number;
  horizonteInicial?: HorizonteDias;
  /** Injetável para manter story e teste independentes do relógio. */
  agora?: Date;
  className?: string;
}) {
  const [horizonteDias, setHorizonteDias] =
    useState<HorizonteDias>(horizonteInicial);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {medicoes.length > 0 ? (
        <SeletorHorizonte valor={horizonteDias} aoMudar={setHorizonteDias} />
      ) : null}
      <GraficoPeso
        medicoes={medicoes}
        pesoMetaKg={pesoMetaKg}
        horizonteDias={horizonteDias}
        agora={agora}
      />
    </div>
  );
}
