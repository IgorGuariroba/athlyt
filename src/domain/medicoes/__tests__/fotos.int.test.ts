import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import type { StoragePrivado } from "@/infra/storage";
import { aplicarRetencaoFotos, excluirFotosCorporais, lerFotosCorporais, listarFotosCorporais, registrarFotoCorporal } from "../fotos";

function storageFake(opcoes: { falharExclusao?: boolean } = {}): StoragePrivado {
  const objetos = new Map<string, Uint8Array>();
  return {
    gravar({ chave, corpo }) { objetos.set(chave, corpo); return Promise.resolve(); },
    existe(chave) { return Promise.resolve(objetos.has(chave)); },
    ler(chave) { const corpo = objetos.get(chave); if (!corpo) return Promise.reject(new Error("ausente")); return Promise.resolve({ corpo, contentType: "image/webp" }); },
    urlLeitura(chave) { if (!objetos.has(chave)) return Promise.reject(new Error("ausente")); return Promise.resolve(`https://teste/${chave}`); },
    excluir(chave) { if (opcoes.falharExclusao) return Promise.reject(new Error("storage indisponível")); objetos.delete(chave); return Promise.resolve(); },
  };
}

async function usuario() {
  const [linha] = await db.insert(users).values({ email: `fotos-${randomUUID()}@example.com` }).returning();
  if (!linha) throw new Error("usuário não criado");
  return linha.id;
}

async function imagem() {
  return new Uint8Array(await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).jpeg().toBuffer());
}

describe("ciclo de vida de fotos corporais", () => {
  it("registra e lista com URL assinada sem expor a chave", async () => {
    const userId = await usuario();
    const storage = storageFake();
    const foto = await registrarFotoCorporal(userId, { pose: "frente", bytes: await imagem(), contentType: "image/jpeg" }, storage);
    const listadas = await listarFotosCorporais(userId, storage);
    expect(foto).not.toHaveProperty("objectKey");
    expect(listadas).toHaveLength(1);
    expect(listadas[0]).toMatchObject({ id: foto.id, pose: "frente", url: expect.stringContaining("https://teste/") });
  });

  it("mantém a linha pendente quando o bucket falha e retoma depois", async () => {
    const userId = await usuario();
    const armazenamento = storageFake();
    const foto = await registrarFotoCorporal(userId, { pose: "costas", bytes: await imagem(), contentType: "image/jpeg" }, armazenamento);
    const falha = await excluirFotosCorporais(userId, [foto.id], storageFake({ falharExclusao: true }));
    expect(falha.pendentes).toEqual([foto.id]);
    expect(await listarFotosCorporais(userId, armazenamento)).toEqual([]);
    const sucesso = await excluirFotosCorporais(userId, [foto.id], armazenamento);
    expect(sucesso.concluidas).toEqual([foto.id]);
    expect(await listarFotosCorporais(userId, armazenamento)).toEqual([]);
  });

  it("lê conteúdo autorizado e aplica retenção apenas às fotos vencidas", async () => {
    const userId = await usuario();
    const armazenamento = storageFake();
    const vencida = await registrarFotoCorporal(userId, { pose: "frente", bytes: await imagem(), contentType: "image/jpeg", excluirEm: new Date("2020-01-01T00:00:00Z") }, armazenamento);
    const vigente = await registrarFotoCorporal(userId, { pose: "costas", bytes: await imagem(), contentType: "image/jpeg", excluirEm: new Date("2090-01-01T00:00:00Z") }, armazenamento);
    expect((await lerFotosCorporais(userId, [vigente.id], armazenamento))?.[0]?.dados.byteLength).toBeGreaterThan(0);
    const resultado = await aplicarRetencaoFotos(new Date("2026-01-01T00:00:00Z"), armazenamento);
    expect(resultado.concluidas).toContain(vencida.id);
    expect(resultado.concluidas).not.toContain(vigente.id);
    expect((await listarFotosCorporais(userId, armazenamento)).map((foto) => foto.id)).toEqual([vigente.id]);
  });
});
