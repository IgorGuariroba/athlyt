"use client";

import { useSyncExternalStore } from "react";

export interface RascunhoSerie {
  cargaKg?: string;
  repeticoes?: string;
  rir?: string;
}

type CampoRascunhoSerie = keyof RascunhoSerie;
type EstadoRascunhos = Readonly<Record<string, RascunhoSerie>>;

const VAZIO: EstadoRascunhos = {};
let estado: EstadoRascunhos = VAZIO;
const assinantes = new Set<() => void>();

function chave(sessionId: string, exercicioId: string, numero: number): string {
  return `${sessionId}:${exercicioId}:${numero}`;
}

function notificar(): void {
  for (const assinante of assinantes) assinante();
}

function assinar(assinante: () => void): () => void {
  assinantes.add(assinante);
  return () => void assinantes.delete(assinante);
}

function ler(): EstadoRascunhos {
  return estado;
}

function lerServidor(): EstadoRascunhos {
  return VAZIO;
}

export function useRascunhoSerie(sessionId: string, exercicioId: string, numero: number): RascunhoSerie | undefined {
  const rascunhos = useSyncExternalStore(assinar, ler, lerServidor);
  return rascunhos[chave(sessionId, exercicioId, numero)];
}

export function atualizarRascunhoSerie(sessionId: string, exercicioId: string, numero: number, campo: CampoRascunhoSerie, valor: string): void {
  const id = chave(sessionId, exercicioId, numero);
  estado = { ...estado, [id]: { ...estado[id], [campo]: valor } };
  notificar();
}

export function removerRascunhoSerie(sessionId: string, exercicioId: string, numero: number): void {
  const id = chave(sessionId, exercicioId, numero);
  if (!(id in estado)) return;
  const restantes = { ...estado };
  delete restantes[id];
  estado = Object.keys(restantes).length ? restantes : VAZIO;
  notificar();
}

/** Limpa o estado global entre testes. Rascunhos reais somem no reload. */
export function reiniciarRascunhosSerie(): void {
  estado = VAZIO;
  notificar();
}
