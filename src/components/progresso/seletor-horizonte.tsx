"use client";

import { SeletorSegmentado } from "@/components/tela";
import {
  HORIZONTES_DISPONIVEIS,
  type HorizonteDias,
} from "@/domain/medicoes/plano-peso";

/**
 * Recorte temporal do gráfico de peso: 30, 90 ou 120 dias.
 *
 * Vive fora do cartão do gráfico porque é um **filtro da leitura**, não
 * parte da figura. O gráfico continua legível se recortado por
 * qualquer outro meio; o `aria-label` dele já declara o período
 * desenhado, então o controle não precisa estar dentro da figura para
 * a leitura fazer sentido.
 *
 * Traduz dias (domínio, número) para o `SeletorSegmentado` (interface,
 * string) — é essa conversão que justifica o componente existir em vez
 * de configurar o seletor genérico em cada chamada.
 */
export function SeletorHorizonte({
  valor,
  aoMudar,
  className,
}: {
  valor: HorizonteDias;
  aoMudar: (dias: HorizonteDias) => void;
  className?: string;
}) {
  return (
    <SeletorSegmentado
      rotulo="Período do gráfico"
      name="horizonte-peso"
      valor={String(valor)}
      opcoes={HORIZONTES_DISPONIVEIS.map((dias) => ({
        valor: String(dias),
        rotulo: String(dias),
        // O rótulo visual é só o número, para caber em três segmentos
        // numa tela de 390px; quem lê por voz ouve a unidade.
        descricao: `${dias} dias`,
      }))}
      aoMudar={(escolhido) => aoMudar(Number(escolhido) as HorizonteDias)}
      className={className}
    />
  );
}
