import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { ItemLinhaDoTempo } from "@/domain/diario/tipos";
import { LinhaDoTempoDia, contarItensDoDia } from "../linha-do-tempo-dia";

afterEach(cleanup);

const MACROS = { calorias: 620, proteinaG: 45, carboidratosG: 60, gordurasG: 20 };

const ITENS = [
  {
    tipo: "planejada",
    horaLocal: "12:30",
    entrada: {
      refeicaoRef: "almoco",
      nome: "Almoço",
      horaLocal: "12:30",
      macros: MACROS,
      itens: [{ nome: "Frango grelhado", quantidade: "180 g", ...MACROS }],
    },
  },
  {
    tipo: "sessao",
    horaLocal: "19:00",
    sessaoId: "s1",
    nome: "Puxar A",
    estado: "concluida",
  },
] as unknown as ItemLinhaDoTempo[];

const acao = () => Promise.resolve();

/**
 * O contrato desta camada é a separação entre extrato (Diário) e foco
 * (Dieta): o mesmo agregado do domínio, um único conjunto de cartões,
 * dois recortes.
 */
describe("linha do tempo de um dia", () => {
  it("mostra sessões de treino no extrato completo do Diário", () => {
    render(
      <LinhaDoTempoDia itens={ITENS} dia="2026-08-19" fuso="America/Sao_Paulo" confirmar={acao} desfazer={acao} />,
    );

    expect(screen.getByText("Puxar A")).toBeTruthy();
    expect(screen.getByText("Almoço")).toBeTruthy();
  });

  it("omite sessões de treino quando a aba Dieta pede foco alimentar", () => {
    render(
      <LinhaDoTempoDia itens={ITENS} dia="2026-08-19" fuso="America/Sao_Paulo" confirmar={acao} desfazer={acao} apenasAlimentar />,
    );

    expect(screen.queryByText("Puxar A")).toBeNull();
    expect(screen.getByText("Almoço")).toBeTruthy();
  });

  it("conta os itens com o mesmo filtro usado na renderização", () => {
    expect(contarItensDoDia(ITENS)).toBe(2);
    expect(contarItensDoDia(ITENS, true)).toBe(1);
  });
});
