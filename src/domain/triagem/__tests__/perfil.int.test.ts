import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import {
  registrarRespostas,
  obterPerfilVigente,
  listarHistoricoPerfil,
} from "../perfil";

/**
 * Seam: a tabela `profile_version` via Drizzle, contra um Postgres
 * real de desenvolvimento (mesmo padrão de
 * src/domain/acesso/__tests__/sessions.int.test.ts). Cobre a correção e o
 * versionamento de dados do perfil sem apagar o histórico.
 */
describe("registrarRespostas / obterPerfilVigente", () => {
  async function criarUsuario() {
    const [user] = await db
      .insert(users)
      .values({ email: `perfil-test-${randomUUID()}@example.com` })
      .returning();
  if (!user) throw new Error("Falha ao criar usuário de teste.");
    return user.id;
  }

  it("não há perfil vigente antes de qualquer resposta", async () => {
    const userId = await criarUsuario();
    const perfil = await obterPerfilVigente(userId);
    expect(perfil).toBeNull();
  });

  it("cria a versão 1 na primeira resposta e a retorna como vigente", async () => {
    const userId = await criarUsuario();

    await registrarRespostas(userId, { dataNascimento: "1994-05-01" });

    const perfil = await obterPerfilVigente(userId);
    expect(perfil?.version).toBe(1);
    expect(perfil?.respostas).toEqual({ dataNascimento: "1994-05-01" });
  });

  it("faz merge das novas respostas sobre a versão anterior, criando versão nova", async () => {
    const userId = await criarUsuario();

    await registrarRespostas(userId, { dataNascimento: "1994-05-01" });
    await registrarRespostas(userId, { sexoBiologico: "masculino" });

    const perfil = await obterPerfilVigente(userId);
    expect(perfil?.version).toBe(2);
    expect(perfil?.respostas).toEqual({
      dataNascimento: "1994-05-01",
      sexoBiologico: "masculino",
    });
  });

  it("corrigir um dado gera versão nova sem apagar a anterior", async () => {
    const userId = await criarUsuario();

    await registrarRespostas(userId, { pesoKg: 80 });
    await registrarRespostas(userId, { pesoKg: 78 });

    const perfil = await obterPerfilVigente(userId);
    expect(perfil?.version).toBe(2);
    expect(perfil?.respostas.pesoKg).toBe(78);
  });

  it("lista o histórico completo de versões, mais recente primeiro, sem apagar correções anteriores", async () => {
    const userId = await criarUsuario();

    await registrarRespostas(userId, { pesoKg: 80 });
    await registrarRespostas(userId, { pesoKg: 78 });
    await registrarRespostas(userId, { sexoBiologico: "masculino" });

    const historico = await listarHistoricoPerfil(userId);

    expect(historico).toHaveLength(3);
    expect(historico.map((v) => v.version)).toEqual([3, 2, 1]);
    expect(historico[2]!.respostas).toEqual({ pesoKg: 80 });
    expect(historico[1]!.respostas).toEqual({ pesoKg: 78 });
    expect(historico[0]!.respostas).toEqual({
      pesoKg: 78,
      sexoBiologico: "masculino",
    });
  });

  it("não mistura perfis de usuários diferentes", async () => {
    const userA = await criarUsuario();
    const userB = await criarUsuario();

    await registrarRespostas(userA, { pesoKg: 80 });
    await registrarRespostas(userB, { pesoKg: 100 });

    const perfilA = await obterPerfilVigente(userA);
    const perfilB = await obterPerfilVigente(userB);

    expect(perfilA?.respostas.pesoKg).toBe(80);
    expect(perfilB?.respostas.pesoKg).toBe(100);
  });
});
