"use client";

import { useSyncExternalStore } from "react";
import { ehRitmoDescanso, RITMO_PADRAO, type RitmoDescanso } from "@/domain/sessao/descanso";

/**
 * Ritmo de descanso escolhido pelo atleta, por exercício.
 *
 * Vive em `localStorage` e não no servidor de propósito: é preferência
 * de execução, não prescrição. Mandá-la ao banco a cada toque criaria
 * uma escrita de rede entre séries — exatamente o momento em que o app
 * precisa responder — e faria a escolha depender de conexão, num fluxo
 * que é offline-first.
 *
 * A chave é o exercício, não a sessão: quem descansa mais no
 * agachamento descansa mais no agachamento da semana que vem, e
 * repetir a escolha a cada treino seria a fricção que o seletor existe
 * para remover.
 *
 * Como a fonte da verdade está fora do React (e é compartilhada entre
 * abas), o React apenas assina — ver `docs/memory/estado-offline-fora-do-react.md`.
 * O snapshot precisa ser estável entre notificações: devolver objeto
 * novo a cada leitura faria `useSyncExternalStore` entrar em laço.
 */

const CHAVE = "athlyt:ritmo-descanso";

type Preferencias = Readonly<Record<string, RitmoDescanso>>;

const VAZIO: Preferencias = {};

let estado: Preferencias = VAZIO;
let carregado = false;
const assinantes = new Set<() => void>();

function notificar(): void {
  for (const assinante of assinantes) assinante();
}

function ler(): Preferencias {
  if (typeof window === "undefined") return VAZIO;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return VAZIO;
    const dados: unknown = JSON.parse(bruto);
    if (typeof dados !== "object" || dados === null) return VAZIO;
    const validos: Record<string, RitmoDescanso> = {};
    for (const [exercicioId, ritmo] of Object.entries(dados)) {
      if (ehRitmoDescanso(ritmo)) validos[exercicioId] = ritmo;
    }
    return validos;
  } catch {
    // Modo privado, cota estourada ou JSON corrompido não podem
    // derrubar a tela de sessão: sem preferência, vale o plano.
    return VAZIO;
  }
}

function carregar(): void {
  if (carregado) return;
  carregado = true;
  estado = ler();
}

export function assinarDescanso(aoMudar: () => void): () => void {
  carregar();
  assinantes.add(aoMudar);
  const sincronizarEntreAbas = (evento: StorageEvent) => {
    if (evento.key !== null && evento.key !== CHAVE) return;
    estado = ler();
    notificar();
  };
  window.addEventListener("storage", sincronizarEntreAbas);
  return () => {
    assinantes.delete(aoMudar);
    window.removeEventListener("storage", sincronizarEntreAbas);
  };
}

export function lerDescanso(): Preferencias {
  carregar();
  return estado;
}

/** Na SSR a preferência local é, por definição, desconhecida. */
export function lerDescansoServidor(): Preferencias {
  return VAZIO;
}

export function definirRitmoDescanso(exercicioId: string, ritmo: RitmoDescanso): void {
  carregar();
  if (estado[exercicioId] === ritmo) return;
  estado = { ...estado, [exercicioId]: ritmo };
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch {
    // A escolha vale para esta sessão mesmo sem conseguir persistir.
  }
  notificar();
}

/** Zera o store — usado pelos testes; o estado é global ao módulo. */
export function reiniciarDescanso(): void {
  estado = VAZIO;
  carregado = false;
  notificar();
}

export function useRitmoDescanso(exercicioId: string): RitmoDescanso {
  const preferencias = useSyncExternalStore(assinarDescanso, lerDescanso, lerDescansoServidor);
  return preferencias[exercicioId] ?? RITMO_PADRAO;
}
