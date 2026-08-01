"use client";

import { confirmar, enfileirar, pendentes, sincronizar } from "./outbox-cliente";
import type { EventoOutbox, TipoEventoOutbox } from "@/domain/sessao/outbox";
import type { SerieRegistrada } from "@/domain/sessao/outbox";

/**
 * Store externo da fila offline.
 *
 * A fila não é estado de React: ela vive em IndexedDB, é compartilhada
 * por todas as abas e sobrevive ao fechamento do app. Espelhá-la em
 * `useState` dentro de `useEffect` produz exatamente a classe de bug
 * que este ticket precisa evitar — um badge que diz "0 na fila" porque
 * o componente ainda não releu o banco.
 *
 * Aqui o React apenas *assina* a fonte da verdade, via
 * `useSyncExternalStore`. Cada mutação notifica os assinantes, e o
 * snapshot é estável entre notificações (exigência do hook: devolver
 * objeto novo a cada leitura causa loop infinito de render).
 */

export interface EstadoOutbox {
  fila: EventoOutbox[];
  /** Séries registradas neste aparelho e ainda não vistas pelo servidor. */
  registrosLocais: SerieRegistrada[];
  sincronizando: boolean;
  /** Servidor alcançável mas falhando: nem online pleno, nem offline. */
  degradado: boolean;
  conflitos: number;
}

const VAZIO: EstadoOutbox = { fila: [], registrosLocais: [], sincronizando: false, degradado: false, conflitos: 0 };

let estado: EstadoOutbox = VAZIO;
const assinantes = new Set<() => void>();

function definir(mudanca: Partial<EstadoOutbox>): void {
  estado = { ...estado, ...mudanca };
  for (const assinante of assinantes) assinante();
}

/**
 * Descarta os registros locais que o servidor já reflete.
 *
 * A fila esvaziar não basta como critério: entre o `POST` aceito e o
 * HTML novo chegar há uma janela em que a série não está em lugar
 * nenhum, e a linha voltaria a parecer não registrada — convidando o
 * atleta a registrar de novo. Por isso quem manda soltar é o estado
 * vindo do servidor, não o sucesso do envio.
 */
export function liberarRegistrosConfirmados(confirmadas: readonly { exercicioId: string; numero: number }[]): void {
  const chaves = new Set(confirmadas.map((s) => `${s.exercicioId}#${s.numero}`));
  const restantes = estado.registrosLocais.filter((r) => !chaves.has(`${r.exercicioId}#${r.numero}`));
  if (restantes.length !== estado.registrosLocais.length) definir({ registrosLocais: restantes });
}

/** Zera o estado ao trocar de sessão: o store é global ao módulo. */
export function reiniciarOutbox(): void {
  estado = VAZIO;
  for (const assinante of assinantes) assinante();
}

export function assinarOutbox(aoMudar: () => void): () => void {
  assinantes.add(aoMudar);
  return () => void assinantes.delete(aoMudar);
}

export function lerOutbox(): EstadoOutbox {
  return estado;
}

/** Snapshot do servidor: durante SSR a fila local é, por definição, desconhecida. */
export function lerOutboxServidor(): EstadoOutbox {
  return VAZIO;
}

export async function recarregarFila(sessionId?: string): Promise<EventoOutbox[]> {
  const fila = await pendentes(sessionId);
  definir({ fila });
  return fila;
}

export async function registrarNaFila(sessionId: string, tipo: TipoEventoOutbox, dados: Record<string, unknown>): Promise<void> {
  await enfileirar(sessionId, tipo, dados);
  if (tipo === "serie_registrada") {
    const serie = dados as unknown as SerieRegistrada;
    definir({
      registrosLocais: [
        ...estado.registrosLocais.filter((r) => !(r.exercicioId === serie.exercicioId && r.numero === serie.numero)),
        serie,
      ],
    });
  }
  await recarregarFila(sessionId);
}

/**
 * Drena a fila de uma sessão. Devolve se algo entrou no servidor, para
 * que quem chamou decida sobre revalidar a página — o store não conhece
 * o router de propósito.
 */
export async function drenarFila(sessionId: string): Promise<{ aplicou: boolean }> {
  const fila = await pendentes(sessionId);
  if (!navigator.onLine || fila.length === 0) {
    definir({ fila });
    return { aplicou: false };
  }
  definir({ sincronizando: true });
  try {
    const resultado = await sincronizar(sessionId);
    definir({
      sincronizando: false,
      degradado: false,
      conflitos: estado.conflitos + (resultado?.conflitos.length ?? 0),
      fila: await pendentes(sessionId),
    });
    return { aplicou: (resultado?.aplicados.length ?? 0) > 0 };
  } catch {
    definir({ sincronizando: false, degradado: true, fila: await pendentes(sessionId) });
    return { aplicou: false };
  }
}

export { confirmar };
