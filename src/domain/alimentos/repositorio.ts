import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { foodEntries, foodLibrary } from "@/db/schema";
import { somarMacros } from "@/domain/diario/cardapio";
import { FUSO_PADRAO, diaAlimentar, horaLocal, instanteDeHoraLocal } from "@/domain/diario/dia-alimentar";
import { obterPlanoAtivo } from "@/domain/plano/repositorio";
import type { ConsumoConfirmado, Macros } from "@/domain/diario/tipos";
import type { Porcao } from "./base";
import type { ItemPrato } from "./prato";

export interface ItemBiblioteca {
  id: string;
  alimentoId: string | null;
  nome: string;
  por100g: Macros | null;
  porcoes: Porcao[] | null;
}

/**
 * Registra o Prato inteiro como um único Consumo Confirmado avulso
 * (telas 050–053, 058; user story 49d).
 *
 * Avulso é deliberadamente distinto de `planejado`/`editado`: ele não
 * consome uma Entrada Planejada e por isso não participa do índice
 * único por refeição — dois lanches no mesmo dia são dois eventos
 * legítimos, não uma duplicata a ser deduplicada.
 */
export async function registrarPrato(
  userId: string,
  entrada: { nome: string; itens: readonly ItemPrato[]; dia?: string; fuso?: string; agora?: Date },
): Promise<ConsumoConfirmado> {
  if (entrada.itens.length === 0) {
    throw new Error("Um registro precisa de ao menos um item no Prato.");
  }
  const fuso = entrada.fuso ?? FUSO_PADRAO;
  const agora = entrada.agora ?? new Date();
  const dia = entrada.dia ?? diaAlimentar(agora, fuso);
  const plano = await obterPlanoAtivo(userId);
  const macros = somarMacros(entrada.itens.map((item) => item));
  // Registrar em dia passado ancora no meio-dia local: "agora" cairia
  // fora do dia que a tela mostra e a refeição sumiria da linha.
  const consumidoEm =
    dia === diaAlimentar(agora, fuso) ? agora : instanteDeHoraLocal(dia, "12:00", fuso);

  const [linha] = await db
    .insert(foodEntries)
    .values({
      userId,
      planId: plano?.id ?? null,
      refeicaoRef: null,
      diaAlimentar: dia,
      nome: entrada.nome.trim() || "Registro avulso",
      origem: "avulso",
      itens: entrada.itens,
      macros,
      planejado: null,
      consumidoEm,
    })
    .returning();

  return {
    id: linha.id,
    refeicaoRef: linha.refeicaoRef,
    nome: linha.nome,
    origem: linha.origem,
    consumidoEm: linha.consumidoEm,
    horaLocal: horaLocal(linha.consumidoEm, fuso),
    itens: linha.itens as ItemPrato[],
    macros: linha.macros as Macros,
    planejado: null,
  };
}

/** Alterna o favorito de um alimento do catálogo (tela 053). */
export async function alternarFavorito(userId: string, alimentoId: string): Promise<boolean> {
  const [existente] = await db
    .select()
    .from(foodLibrary)
    .where(and(eq(foodLibrary.userId, userId), eq(foodLibrary.alimentoId, alimentoId)))
    .limit(1);
  if (existente) {
    await db.delete(foodLibrary).where(eq(foodLibrary.id, existente.id));
    return false;
  }
  await db.insert(foodLibrary).values({ userId, alimentoId, nome: alimentoId, favorito: true });
  return true;
}

/**
 * Alimento criado na entrada manual (tela 052), reutilizável depois.
 * Fica na mesma biblioteca dos favoritos porque a pergunta da tela é
 * a mesma: o que este atleta reusa?
 */
export async function salvarAlimentoProprio(
  userId: string,
  entrada: { nome: string; por100g: Macros; porcoes: Porcao[] },
): Promise<ItemBiblioteca> {
  const [linha] = await db
    .insert(foodLibrary)
    .values({
      userId,
      alimentoId: null,
      nome: entrada.nome.trim(),
      favorito: true,
      por100g: entrada.por100g,
      porcoes: entrada.porcoes,
    })
    .returning();
  return mapearBiblioteca(linha);
}

function mapearBiblioteca(linha: typeof foodLibrary.$inferSelect): ItemBiblioteca {
  return {
    id: linha.id,
    alimentoId: linha.alimentoId,
    nome: linha.nome,
    por100g: (linha.por100g as Macros | null) ?? null,
    porcoes: (linha.porcoes as Porcao[] | null) ?? null,
  };
}

export async function listarFavoritos(userId: string): Promise<ItemBiblioteca[]> {
  const linhas = await db
    .select()
    .from(foodLibrary)
    .where(eq(foodLibrary.userId, userId))
    .orderBy(desc(foodLibrary.createdAt));
  return linhas.map(mapearBiblioteca);
}

export async function listarAlimentosProprios(userId: string): Promise<ItemBiblioteca[]> {
  const linhas = await db
    .select()
    .from(foodLibrary)
    .where(and(eq(foodLibrary.userId, userId), isNull(foodLibrary.alimentoId)))
    .orderBy(desc(foodLibrary.createdAt));
  return linhas.map(mapearBiblioteca);
}

export interface Recorrente {
  alimentoId: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  vezes: number;
}

/**
 * Recorrentes derivados do histórico real (user story 49).
 *
 * Não há tabela própria de propósito: a frequência já está em
 * `food_entry`, e mantê-la em dois lugares criaria duas verdades sobre
 * a mesma história — exatamente o tipo de derivação divergente que a
 * memória `persistencia-visivel-apos-retorno.md` classifica como
 * causa 3 de "não persistiu".
 */
export async function listarRecorrentes(userId: string, limite = 8): Promise<Recorrente[]> {
  const linhas = await db
    .select({ itens: foodEntries.itens })
    .from(foodEntries)
    .where(eq(foodEntries.userId, userId))
    .orderBy(desc(foodEntries.consumidoEm))
    .limit(60);

  const contagem = new Map<string, Recorrente>();
  for (const linha of linhas) {
    for (const item of (linha.itens as ItemPrato[]) ?? []) {
      if (!item?.alimentoId) continue;
      const atual = contagem.get(item.alimentoId);
      contagem.set(item.alimentoId, {
        alimentoId: item.alimentoId,
        descricao: item.descricao,
        quantidade: item.quantidade ?? 1,
        unidade: item.unidade ?? "g",
        vezes: (atual?.vezes ?? 0) + 1,
      });
    }
  }
  return [...contagem.values()].sort((a, b) => b.vezes - a.vezes).slice(0, limite);
}
