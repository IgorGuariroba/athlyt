"use client";

import type { EventoOutbox, TipoEventoOutbox } from "@/domain/sessao/outbox";

/**
 * Fila local da Sessão de Treino em IndexedDB.
 *
 * IndexedDB, e não localStorage, porque a fila precisa sobreviver ao
 * fechamento da aba e a escrita precisa ser transacional: um registro
 * de série perdido por escrita parcial é exatamente a perda silenciosa
 * que a spec proíbe.
 *
 * A ordem lógica é um contador persistido junto da fila. Ele não pode
 * derivar do relógio: durante a sessão o aparelho pode ajustar a hora
 * (ou o usuário pode ajustá-la), e dois registros no mesmo segundo são
 * comuns em séries rápidas.
 */

const BANCO = "athlyt-outbox";
const VERSAO = 1;
const LOJA = "eventos";
const META = "meta";

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BANCO, VERSAO);
    pedido.onupgradeneeded = () => {
      const bd = pedido.result;
      if (!bd.objectStoreNames.contains(LOJA)) {
        bd.createObjectStore(LOJA, { keyPath: "id" }).createIndex("sessionId", "sessionId");
      }
      if (!bd.objectStoreNames.contains(META)) bd.createObjectStore(META);
    };
    pedido.onsuccess = () => {
      resolve(pedido.result);
    };
    pedido.onerror = () => {
      reject(pedido.error ?? new Error("Falha ao abrir IndexedDB"));
    };
  });
}

function promessa<T>(pedido: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    pedido.onsuccess = () => {
      resolve(pedido.result);
    };
    pedido.onerror = () => {
      reject(pedido.error ?? new Error("Falha na requisição IndexedDB"));
    };
  });
}

/**
 * Enfileira um evento. O contador de ordem é lido e gravado na mesma
 * transação do evento: sem isso, dois cliques rápidos poderiam receber
 * a mesma ordem e o merge no servidor perderia o desempate.
 */
export async function enfileirar(sessionId: string, tipo: TipoEventoOutbox, dados: Record<string, unknown>): Promise<EventoOutbox> {
  const bd = await abrir();
  try {
    const tx = bd.transaction([LOJA, META], "readwrite");
    const meta = tx.objectStore(META);
    const chave = `ordem:${sessionId}`;
    // A loja META é sem schema (`createObjectStore(META)` sem keyPath), então
    // `get` devolve `IDBRequest<any>`. O recast tipa o contrato de escrita
    // deste módulo: só ele grava nela, sempre números.
    const ordem = ((await promessa<number | undefined>(meta.get(chave) as IDBRequest<number | undefined>)) ?? 0) + 1;
    const evento: EventoOutbox = {
      id: crypto.randomUUID(), sessionId, tipo, ordem,
      ocorridoEm: new Date().toISOString(), dados,
    };
    meta.put(ordem, chave);
    tx.objectStore(LOJA).put(evento);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => {
        resolve();
      };
      tx.onerror = () => {
        reject(tx.error ?? new Error("Falha na transação IndexedDB"));
      };
    });
    return evento;
  } finally {
    bd.close();
  }
}

export async function pendentes(sessionId?: string): Promise<EventoOutbox[]> {
  const bd = await abrir();
  try {
    const loja = bd.transaction(LOJA, "readonly").objectStore(LOJA);
    // Mesmo contrato: a loja de eventos só recebe `EventoOutbox` gravado
    // por `enfileirar`, então o `getAll` genérico (`any[]`) é afinado ao
    // tipo que este módulo garante.
    const todos = await promessa<EventoOutbox[]>(loja.getAll() as IDBRequest<EventoOutbox[]>);
    const filtrados = sessionId ? todos.filter((e) => e.sessionId === sessionId) : todos;
    return filtrados.sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id));
  } finally {
    bd.close();
  }
}

/**
 * Remove da fila somente o que o servidor confirmou — aplicado ou
 * reconhecido como duplicata. Conflito **não** entra aqui: ele fica
 * fora da fila porque já está materializado no servidor aguardando
 * decisão, e reenviá-lo só geraria ruído.
 */
export async function confirmar(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const bd = await abrir();
  try {
    const tx = bd.transaction(LOJA, "readwrite");
    const loja = tx.objectStore(LOJA);
    for (const id of ids) loja.delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => {
        resolve();
      };
      tx.onerror = () => {
        reject(tx.error ?? new Error("Falha na transação IndexedDB"));
      };
    });
  } finally {
    bd.close();
  }
}

export interface RespostaSincronizacao {
  aplicados: string[];
  duplicados: string[];
  conflitos: Array<{ id: string; motivo: string }>;
  /**
   * Recusados por defeito do cliente. Saem da fila porque nenhum
   * reenvio os torna válidos — mantê-los só travaria a drenagem de
   * tudo o que vem depois.
   */
  inadmissiveis?: Array<{ id: string; motivo: string }>;
}

/**
 * Drena a fila de uma sessão contra o endpoint idempotente. Falha de
 * rede não descarta nada: os eventos continuam na fila para a próxima
 * tentativa, que é segura justamente por ser idempotente.
 */
export async function sincronizar(sessionId: string): Promise<RespostaSincronizacao | null> {
  const fila = await pendentes(sessionId);
  if (fila.length === 0) return null;

  const resposta = await fetch(`/api/sessao/${sessionId}/sincronizar`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventos: fila }),
  });
  if (!resposta.ok) throw new Error(`Sincronização falhou (${resposta.status}).`);

  const resultado = (await resposta.json()) as RespostaSincronizacao;
  const resolvidos = new Set([
    ...resultado.conflitos.map((c) => c.id),
    ...(resultado.inadmissiveis ?? []).map((r) => r.id),
  ]);
  await confirmar([...resultado.aplicados, ...resultado.duplicados, ...fila.map((e) => e.id).filter((id) => resolvidos.has(id))]);
  return resultado;
}
