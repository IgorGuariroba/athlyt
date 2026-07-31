import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { decisionTrails, plans, users } from "@/db/schema";
import { obterOuGerarRascunho, ativarPlano, substituirNoRascunho } from "../repositorio";
import type { RespostasTriagem } from "@/domain/triagem/etapas";

const respostas: RespostasTriagem = {
  dataNascimento: "1995-01-01", sexoBiologico: "masculino", alturaCm: 180, pesoKg: 80,
  objetivoComposicao: "recomposicao", experienciaTreino: "intermediario",
  diasDisponiveis: ["segunda", "quinta"], duracaoSessaoMin: 60,
  localTreino: "academia-completa", equipamentos: ["halteres", "banco-reto", "elasticos"],
};

async function usuario() {
  const [u] = await db.insert(users).values({ email: `plano-${randomUUID()}@example.com` }).returning();
  return u.id;
}

describe("ciclo do Plano Ativo", () => {
  it("geração é idempotente para a mesma versão de perfil e registra trilha", async () => {
    const userId = await usuario();
    const a = await obterOuGerarRascunho(userId, { version: 9, respostas });
    const b = await obterOuGerarRascunho(userId, { version: 9, respostas });
    expect(b.id).toBe(a.id);
    const trilhas = await db.select().from(decisionTrails).where(eq(decisionTrails.userId, userId));
    expect(trilhas).toHaveLength(1);
    expect(trilhas[0].modeloResolvido).toBe("motor-plano-v1");
    expect(trilhas[0].camposEnviados).toContain("equipamentos");
  });

  it("substituição pré-ativação persiste e entra na Trilha de Decisão", async () => {
    const userId = await usuario();
    const rascunho = await obterOuGerarRascunho(userId, { version: 9, respostas });
    const dia = rascunho.conteudo.bloco.dias[0];
    const atual = dia.exercicios.find((e) => e.padrao === "empurrar-horizontal")!;
    const alterado = await substituirNoRascunho(userId, { planoId: rascunho.id, diaId: dia.id, exercicioId: atual.exercicioId, novoExercicioId: "flexao-de-braco" }, respostas);
    expect(alterado.conteudo.bloco.dias[0].exercicios.map((e) => e.exercicioId)).toContain("flexao-de-braco");
    const trilhas = await db.select().from(decisionTrails).where(eq(decisionTrails.userId, userId));
    expect(trilhas).toHaveLength(2);
    expect((trilhas[1].resultado as { tipo: string }).tipo).toBe("substituicao-pre-ativacao");
  });

  it("ativação cria versão e torna o conteúdo imutável pela API", async () => {
    const userId = await usuario();
    const rascunho = await obterOuGerarRascunho(userId, { version: 9, respostas });
    const ativo = await ativarPlano(userId, rascunho.id);
    expect(ativo.estado).toBe("ativo");
    expect(ativo.versao).toBe(1);
    await expect(ativarPlano(userId, rascunho.id)).rejects.toThrow("já ativado");
    const dia = ativo.conteudo.bloco.dias[0];
    await expect(substituirNoRascunho(userId, { planoId: ativo.id, diaId: dia.id, exercicioId: dia.exercicios[0].exercicioId, novoExercicioId: "prancha" }, respostas)).rejects.toThrow("rascunho");
  });

  it("ativar novo plano arquiva o anterior e incrementa versão", async () => {
    const userId = await usuario();
    const primeiro = await obterOuGerarRascunho(userId, { version: 1, respostas });
    await ativarPlano(userId, primeiro.id);
    const segundo = await obterOuGerarRascunho(userId, { version: 2, respostas: { ...respostas, pesoKg: 81 } });
    const ativo = await ativarPlano(userId, segundo.id);
    expect(ativo.versao).toBe(2);
    const linhas = await db.select().from(plans).where(eq(plans.userId, userId));
    expect(linhas.find((p) => p.id === primeiro.id)?.estado).toBe("arquivado");
  });
});
