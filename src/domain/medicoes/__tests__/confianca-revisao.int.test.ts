// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { bodyMeasurements, users } from "@/db/schema";
import { gerarRevisaoSemanal } from "@/app/(app)/progresso/revisao/actions";
import { obterOuGerarRascunho } from "@/domain/plano/repositorio";
import { obterPerfilVigente, registrarRespostas } from "@/domain/triagem/perfil";
import type { RespostasTriagem } from "@/domain/triagem/etapas";
import type { ConfiancaCorporal } from "..";
import { obterPanoramaCorporal, registrarCircunferencia, registrarGorduraCorporal } from "../repositorio";

// Somente fronteiras do framework: domínio, action e Postgres executam de verdade.
const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => { throw new Error(`NEXT_REDIRECT:${destino}`); },
}));

const respostasBase: RespostasTriagem = {
  dataNascimento: "1995-01-01",
  sexoBiologico: "masculino",
  pesoKg: 80,
  alturaCm: 180,
  experienciaTreino: "intermediario",
  diasDisponiveis: ["segunda", "quinta"],
  duracaoSessaoMin: 60,
  localTreino: "academia-completa",
  lesoes: "",
  condicoes: "",
};

const confiancaTres: ConfiancaCorporal = {
  composicaoCorporal: "confiavel",
  proporcoes: "confiavel",
  simetriaBilateral: "limitada",
  treinamento: "indisponivel",
  nutricao: "indisponivel",
  saudeRecuperacao: "confiavel",
};

const casos: {
  nome: string;
  respostas: RespostasTriagem;
  confianca: ConfiancaCorporal;
  proposta: "manter" | "auto_aplicado";
}[] = [
  { nome: "sem equipamentos nem objetivo", respostas: respostasBase, confianca: confiancaTres, proposta: "manter" },
  {
    nome: "sem duração da sessão",
    respostas: { ...respostasBase, equipamentos: [], duracaoSessaoMin: undefined },
    confianca: confiancaTres,
    proposta: "manter",
  },
  {
    nome: "sem local de treino",
    respostas: { ...respostasBase, equipamentos: [], localTreino: undefined },
    confianca: confiancaTres,
    proposta: "manter",
  },
  {
    nome: "equipamentos e disponibilidade explicitamente vazios",
    respostas: { ...respostasBase, equipamentos: [], diasDisponiveis: [] },
    confianca: { ...confiancaTres, treinamento: "confiavel" },
    proposta: "auto_aplicado",
  },
  {
    nome: "objetivo respondido",
    respostas: { ...respostasBase, objetivoComposicao: "recomposicao" },
    confianca: { ...confiancaTres, nutricao: "confiavel" },
    proposta: "auto_aplicado",
  },
  {
    nome: "objetivo confirmado sem composição explícita",
    respostas: { ...respostasBase, objetivoConfirmado: true },
    confianca: { ...confiancaTres, nutricao: "confiavel" },
    proposta: "auto_aplicado",
  },
];

let userId: string | undefined;
afterEach(async () => {
  if (userId) await db.delete(users).where(eq(users.id, userId));
  userId = undefined;
  auth.mockReset();
});

describe("confiança do mesmo atleta na Revisão Semanal e no rascunho", () => {
  it.each(casos)("usa a mesma régua canônica: $nome", async ({ respostas, confianca, proposta }) => {
    const [usuario] = await db.insert(users).values({ email: `confianca-197-${randomUUID()}@example.com` }).returning();
    userId = usuario!.id;
    auth.mockResolvedValue({ user: { id: userId } });
    await registrarRespostas(userId, respostas);

    for (const [regiao, cm] of [
      ["cintura", 84], ["pescoco", 38], ["quadril", 98], ["torax", 102], ["ombros", 116],
    ] as const) {
      expect((await registrarCircunferencia(userId, { regiao, leiturasCm: [cm] })).ok).toBe(true);
    }
    for (const [regiao, cm] of [["braco", 35], ["coxa", 58], ["panturrilha", 38]] as const) {
      for (const lado of ["direito", "esquerdo"] as const) {
        expect((await registrarCircunferencia(userId, { regiao, lado, leiturasCm: [cm] })).ok).toBe(true);
      }
    }
    await registrarGorduraCorporal(userId, { percentual: 18, metodo: "bioimpedancia", protocolo: "jejum" });
    // Preparação temporal: o portão de duas semanas não pode mascarar o de confiança.
    // A API de registro de circunferências não recebe observadoEm.
    await db.update(bodyMeasurements).set({ observadoEm: new Date(Date.now() - 21 * 86_400_000) }).where(eq(bodyMeasurements.userId, userId));

    const perfil = await obterPerfilVigente(userId);
    expect(perfil).not.toBeNull();
    const rascunho = await obterOuGerarRascunho(userId, perfil!);
    const formulario = new FormData();
    formulario.set("recuperacao", "2");
    formulario.set("utilidade", "4");
    await expect(gerarRevisaoSemanal(formulario)).rejects.toThrow("NEXT_REDIRECT:/progresso/revisao/scorecard");

    const panorama = await obterPanoramaCorporal(userId);
    expect(panorama.revisoes).toHaveLength(1);
    const revisao = panorama.revisoes[0]!;
    // Resultados públicos persistidos, sem spy nem mock da regra ou dos consumidores.
    expect.soft(revisao.confiancas).toEqual(confianca);
    expect.soft(rascunho.conteudo.confiancaCorporal).toEqual(confianca);
    expect.soft(revisao.confiancas).toEqual(rascunho.conteudo.confiancaCorporal);
    expect.soft(revisao.proposta).toMatchObject({ tipo: proposta });
  });
});
