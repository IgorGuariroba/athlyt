import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { foodEntries, workoutSessions } from "@/db/schema";
import { obterPlanoAtivo } from "@/domain/plano/repositorio";
import {
  MACROS_ZERO,
  entradasPlanejadas,
  metaDoDia,
  somarMacros,
  subtrairMacros,
} from "./cardapio";
import {
  FUSO_PADRAO,
  diaAlimentar,
  horaLocal,
  instanteDeHoraLocal,
  intervaloUtcDoDia,
} from "./dia-alimentar";
import type {
  ConsumoConfirmado,
  DiarioDoDia,
  EntradaPlanejada,
  ItemAlimentar,
  ItemLinhaDoTempo,
  Macros,
} from "./tipos";

function mapear(linha: typeof foodEntries.$inferSelect, fuso: string): ConsumoConfirmado {
  return {
    id: linha.id,
    refeicaoRef: linha.refeicaoRef,
    nome: linha.nome,
    origem: linha.origem,
    consumidoEm: linha.consumidoEm,
    horaLocal: horaLocal(linha.consumidoEm, fuso),
    itens: linha.itens as ItemAlimentar[],
    macros: linha.macros as Macros,
    planejado: (linha.planejado as Macros | null) ?? null,
  };
}

async function consumosDoDia(userId: string, dia: string, fuso: string): Promise<ConsumoConfirmado[]> {
  const { inicio, fim } = intervaloUtcDoDia(dia, fuso);
  const linhas = await db
    .select()
    .from(foodEntries)
    .where(
      and(
        eq(foodEntries.userId, userId),
        gte(foodEntries.consumidoEm, inicio),
        lt(foodEntries.consumidoEm, fim),
      ),
    )
    .orderBy(asc(foodEntries.consumidoEm));
  return linhas.map((linha) => mapear(linha, fuso));
}

export function hojeDoUsuario(fuso: string = FUSO_PADRAO, agora: Date = new Date()): string {
  return diaAlimentar(agora, fuso);
}

/**
 * Linha do tempo do dia (tela 045): Entradas Planejadas do Cardápio
 * Diário, Consumo Confirmado e sessões de treino no mesmo eixo.
 *
 * Uma refeição já confirmada some do estado planejado — o que a
 * substitui é o consumo real, na hora em que de fato aconteceu. Sem
 * isso, o mesmo prato apareceria duas vezes e o atleta não saberia
 * qual das duas linhas conta.
 */
export async function montarDiarioDoDia(
  userId: string,
  entrada: { dia?: string; fuso?: string; agora?: Date } = {},
): Promise<DiarioDoDia> {
  const fuso = entrada.fuso ?? FUSO_PADRAO;
  const dia = entrada.dia ?? hojeDoUsuario(fuso, entrada.agora);
  const plano = await obterPlanoAtivo(userId);
  const meta = plano ? metaDoDia(plano.conteudo.nutricao) : { ...MACROS_ZERO };
  const planejadas = plano ? entradasPlanejadas(plano.conteudo.nutricao) : [];
  const consumos = await consumosDoDia(userId, dia, fuso);
  const confirmadas = new Set(consumos.map((c) => c.refeicaoRef).filter(Boolean));

  const { inicio, fim } = intervaloUtcDoDia(dia, fuso);
  const sessoes = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.startedAt, inicio),
        lt(workoutSessions.startedAt, fim),
      ),
    );

  const itens: ItemLinhaDoTempo[] = [
    ...planejadas
      .filter((planejada) => !confirmadas.has(planejada.refeicaoRef))
      .map((planejada) => ({
        tipo: "planejada" as const,
        horaLocal: planejada.horaLocal,
        entrada: planejada,
      })),
    ...consumos.map((consumo) => ({
      tipo: "consumo" as const,
      horaLocal: consumo.horaLocal,
      consumo,
    })),
    ...sessoes.map((sessao) => ({
      tipo: "sessao" as const,
      horaLocal: horaLocal(sessao.startedAt, fuso),
      sessaoId: sessao.id,
      nome: sessao.nome,
      estado: sessao.estado,
    })),
  ].sort((a, b) => a.horaLocal.localeCompare(b.horaLocal));

  const consumido = somarMacros(consumos.map((c) => c.macros));
  return {
    dia,
    fuso,
    painel: { meta, consumido, restante: subtrairMacros(meta, consumido) },
    linhaDoTempo: itens,
  };
}

export async function obterEntradaPlanejada(
  userId: string,
  refeicaoRef: string,
): Promise<EntradaPlanejada | null> {
  const plano = await obterPlanoAtivo(userId);
  if (!plano) return null;
  return (
    entradasPlanejadas(plano.conteudo.nutricao).find((e) => e.refeicaoRef === refeicaoRef) ?? null
  );
}

/**
 * Confirma uma Entrada Planejada (telas 046–047).
 *
 * `itens` ausente = "comi como planejado", em um toque. Quando vem
 * preenchido, o consumo confirmado é o real e o planejado fica ao
 * lado como snapshot — o desvio é informação, não falta.
 *
 * Confirmar de novo atualiza a mesma linha em vez de duplicar: a
 * chave (usuário, dia, refeição) faz o duplo toque ser inofensivo.
 */
export async function confirmarRefeicao(
  userId: string,
  entrada: {
    refeicaoRef: string;
    itens?: ItemAlimentar[];
    dia?: string;
    fuso?: string;
    agora?: Date;
  },
): Promise<ConsumoConfirmado> {
  const fuso = entrada.fuso ?? FUSO_PADRAO;
  const agora = entrada.agora ?? new Date();
  const dia = entrada.dia ?? diaAlimentar(agora, fuso);
  const plano = await obterPlanoAtivo(userId);
  if (!plano) throw new Error("Plano Ativo não encontrado.");
  const planejada = entradasPlanejadas(plano.conteudo.nutricao).find(
    (e) => e.refeicaoRef === entrada.refeicaoRef,
  );
  if (!planejada) throw new Error("Refeição não pertence ao Cardápio Diário.");

  const editou = entrada.itens !== undefined;
  const itens = entrada.itens ?? planejada.itens;
  const macros = itens.length > 0 ? somarMacros(itens) : { ...MACROS_ZERO };
  // Confirmar um dia passado registra o consumo no fim daquele dia, e
  // não "agora": o instante precisa cair dentro do dia que a tela
  // mostra, senão a refeição desapareceria da própria linha do tempo.
  const consumidoEm =
    dia === diaAlimentar(agora, fuso) ? agora : instanteDeHoraLocal(dia, planejada.horaLocal, fuso);

  const [linha] = await db
    .insert(foodEntries)
    .values({
      userId,
      planId: plano.id,
      refeicaoRef: entrada.refeicaoRef,
      diaAlimentar: dia,
      nome: planejada.nome,
      origem: editou ? "editado" : "planejado",
      itens,
      macros,
      planejado: planejada.macros,
      consumidoEm,
    })
    .onConflictDoUpdate({
      target: [foodEntries.userId, foodEntries.diaAlimentar, foodEntries.refeicaoRef],
      set: { itens, macros, origem: editou ? "editado" : "planejado", consumidoEm },
    })
    .returning();
  return mapear(linha, fuso);
}

/** Desfazer a confirmação (tela 047): a refeição volta a planejada. */
export async function desfazerConfirmacao(
  userId: string,
  entrada: { refeicaoRef: string; dia?: string; fuso?: string; agora?: Date },
): Promise<void> {
  const fuso = entrada.fuso ?? FUSO_PADRAO;
  const dia = entrada.dia ?? diaAlimentar(entrada.agora ?? new Date(), fuso);
  await db
    .delete(foodEntries)
    .where(
      and(
        eq(foodEntries.userId, userId),
        eq(foodEntries.diaAlimentar, dia),
        eq(foodEntries.refeicaoRef, entrada.refeicaoRef),
      ),
    );
}
