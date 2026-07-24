/**
 * Identidade e Acesso — autorização por allowlist, separada da
 * autenticação (specs/mvp-vertical.md, "Implementation Decisions").
 * Um e-mail autenticado com sucesso pelo Google só ganha acesso ao
 * produto se também estiver na allowlist.
 */

/**
 * Compara e-mails de forma tolerante a maiúsculas/minúsculas e a
 * espaços acidentais, sem normalizar apelidos (+tag) ou domínios —
 * a allowlist deve conter o e-mail exato que o usuário usa no Google.
 */
export function isEmailAllowed(
  email: string | null | undefined,
  allowlist: readonly string[],
): boolean {
  if (!email) return false;

  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0) return false;

  return allowlist.some(
    (allowed) => allowed.trim().toLowerCase() === normalized,
  );
}
