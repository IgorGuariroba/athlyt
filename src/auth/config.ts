import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/client";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/db/schema";
import { isEmailAllowed } from "@/domain/acesso/allowlist";
import { getAllowlist } from "./allowlist-store";

/**
 * Rota de acesso restrito (tela 003). Um e-mail autenticado pelo
 * Google mas fora da allowlist é redirecionado para cá — o próprio
 * Auth.js aborta o fluxo antes de qualquer persistência quando o
 * callback signIn devolve uma string, então nenhum usuário/conta é
 * gravado no banco (specs/mvp-vertical.md, user story 3).
 */
export const ACCESS_DENIED_ROUTE = "/acesso-restrito";

/**
 * Fábrica que recebe a busca da allowlist como dependência — o teste
 * do callback substitui `loadAllowlist` por um fake e não toca o
 * banco real.
 */
export function buildAuthConfig(
  loadAllowlist: () => Promise<string[]>,
): NextAuthConfig {
  return {
    // Necessário atrás de proxy reverso (Dockploy/Traefik na VPS,
    // ADR 0003) para o Auth.js confiar no host encaminhado.
    trustHost: true,
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    providers: [Google],
    session: { strategy: "database" },
    pages: {
      error: ACCESS_DENIED_ROUTE,
    },
    callbacks: {
      async signIn({ user }) {
        const allowlist = await loadAllowlist();
        if (!isEmailAllowed(user.email, allowlist)) {
          const deniedEmail = encodeURIComponent(user.email ?? "");
          return `${ACCESS_DENIED_ROUTE}?email=${deniedEmail}`;
        }
        return true;
      },
    },
  };
}

export const authConfig = buildAuthConfig(getAllowlist);
