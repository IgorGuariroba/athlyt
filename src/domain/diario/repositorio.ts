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
 * Linha do tempo do dia: Entradas Planejadas do Cardápio
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
 * Confirma uma Entrada Planejada.
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

/**
 * Consumo já registrado para uma refeição planejada no dia, se houver.
 *
 * Existe para a tela poder **avisar antes de substituir**. O aviso
 * precisa do consumo em si, e não de um booleano:
 * “você já registrou 620 kcal nesta refeição” é o que permite ao
 * atleta decidir se cancela, enquanto “já existe um registro” o obriga
 * a sair da tela para descobrir qual.
 */
export async function obterConsumoPorId(userId: string, consumoId: string, fuso: string = FUSO_PADRAO): Promise<ConsumoConfirmado | null> {
  const [linha] = await db.select().from(foodEntries).where(and(eq(foodEntries.userId, userId), eq(foodEntries.id, consumoId))).limit(1);
  return linha ? mapear(linha, fuso) : null;
}

export async function obterConsumoDaRefeicao(
  userId: string,
  entrada: { refeicaoRef: string; dia: string; fuso?: string },
): Promise<ConsumoConfirmado | null> {
  const fuso = entrada.fuso ?? FUSO_PADRAO;
  const [linha] = await db
    .select()
    .from(foodEntries)
    .where(
      and(
        eq(foodEntries.userId, userId),
        eq(foodEntries.diaAlimentar, entrada.dia),
        eq(foodEntries.refeicaoRef, entrada.refeicaoRef),
      ),
    )
    .limit(1);
  return linha ? mapear(linha, fuso) : null;
}

/**
 * Grava o Consumo Real de um Registro Retroativo.
 *
 * Distingue-se de `confirmarRefeicao` em três pontos: o nome e o
 * horário são escolhidos
 * pelo atleta (não herdados da prescrição), e a refeição pode não
 * ter planejamento nenhum. E de `registrarPrato` por preservar o
 * vínculo com a Refeição Planejada: com `refeicaoRef`, confirmar
 * **substitui** o consumo daquela refeição em vez de somar um segundo
 * evento ao dia — o atleta almoçou uma vez.
 *
 * O planejado continua gravado como referência (`planejado`), nunca
 * mutado: o desvio só é legível se a prescrição original sobreviver
 * ao consumo que a substituiu.
 */
export async function registrarConsumoReal(
  userId: string,
  entrada: {
    consumoId?: string | null;
    refeicaoRef?: string | null;
    nome: string;
    itens: ItemAlimentar[];
    dia: string;
    horaLocal: string;
    fuso?: string;
  },
): Promise<ConsumoConfirmado> {
  if (entrada.itens.length === 0) {
    throw new Error("Um registro precisa de ao menos um item no Prato.");
  }
  const fuso = entrada.fuso ?? FUSO_PADRAO;
  const plano = await obterPlanoAtivo(userId);
  const planejada = plano
    ? entradasPlanejadas(plano.conteudo.nutricao).find(
        (e) => e.refeicaoRef === entrada.refeicaoRef,
      ) ?? null
    : null;
  const macros = somarMacros(entrada.itens);
  // O horário vem do atleta e ancora o registro dentro do dia
  // mostrado: registrar ontem às 20h não pode cair em “agora”, senão a
  // refeição sumiria da linha do tempo que a exibe.
  const consumidoEm = instanteDeHoraLocal(entrada.dia, entrada.horaLocal, fuso);
  const valores = {
    userId,
    planId: plano?.id ?? null,
    refeicaoRef: entrada.refeicaoRef ?? null,
    diaAlimentar: entrada.dia,
    nome: planejada?.nome ?? (entrada.nome.trim() || "Registro retroativo"),
    origem: (entrada.refeicaoRef ? "editado" : "avulso") as "editado" | "avulso",
    itens: entrada.itens,
    macros,
    planejado: planejada?.macros ?? null,
    consumidoEm,
  };

  // Sem `refeicaoRef` o índice único não se aplica (dois lanches no
  // mesmo dia são dois eventos), então o upsert seria inócuo — e o
  // Postgres não casa NULL no target do conflito de qualquer forma.
  if (entrada.consumoId) {
    const [linha] = await db.update(foodEntries).set({ nome: valores.nome, itens: valores.itens, macros, consumidoEm }).where(and(eq(foodEntries.userId, userId), eq(foodEntries.id, entrada.consumoId))).returning();
    if (!linha) throw new Error("Consumo registrado não encontrado.");
    return mapear(linha, fuso);
  }

  const [linha] = entrada.refeicaoRef
    ? await db
        .insert(foodEntries)
        .values(valores)
        .onConflictDoUpdate({
          target: [foodEntries.userId, foodEntries.diaAlimentar, foodEntries.refeicaoRef],
          set: {
            nome: valores.nome,
            itens: valores.itens,
            macros,
            origem: valores.origem,
            consumidoEm,
          },
        })
        .returning()
    : await db.insert(foodEntries).values(valores).returning();

  return mapear(linha, fuso);
}

/** Exclui qualquer Consumo registrado pertencente ao usuário. */
export async function excluirConsumo(userId: string, consumoId: string): Promise<void> {
  await db.delete(foodEntries).where(and(eq(foodEntries.userId, userId), eq(foodEntries.id, consumoId)));
}

/** Desfazer a confirmação: a refeição volta a planejada. */
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
