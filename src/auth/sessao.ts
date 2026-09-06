import { cache } from "react";
import { auth } from ".";

/**
 * Leitura da sessão memoizada pelo escopo do render.
 *
 * `session: { strategy: "database" }` (src/auth/config.ts) faz de cada
 * `auth()` um round-trip ao Postgres. Uma tela do casco consultava a
 * sessão duas vezes por requisição — no layout e na própria page — e as
 * cascatas encadeavam mais uma por helper de leitura. O `cache()` do
 * React colapsa essas chamadas: dentro de um mesmo render, a primeira
 * resolve e as seguintes recebem a mesma promessa.
 *
 * O escopo é a **render pass**, não o processo: dois renders — logo,
 * dois usuários — nunca compartilham o valor. É o que impede que a
 * memoização vire vazamento de sessão entre requisições, e é o que
 * `sessao.unit.test.tsx` verifica.
 *
 * O `auth()` de `src/proxy.ts` fica de fora deste escopo por construção:
 * o middleware roda numa invocação anterior ao render e não participa do
 * cache do React. A consulta dele permanece — trocá-la por inspeção
 * otimista do cookie removeria a proteção que hoje barra o acesso à
 * única rota estática autenticada (`/triagem/avaliacao-corporal`), que
 * não repete a checagem no servidor.
 */
export const obterSessaoAtual = memoizarSessao(() => auth());

/**
 * Seam da memoização: recebe o resolvedor como dependência para que o
 * teste observe quantas vezes ele é chamado por render, sem Auth.js nem
 * banco.
 */
export function memoizarSessao<T>(resolver: () => T): () => T {
  return cache(resolver);
}
