import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Tela 003 — Acesso restrito (specs/workflow/telas/003-acesso-restrito.md).
 * Alcançada pelo redirect do callback signIn quando o e-mail
 * autenticado no Google não está na allowlist. Nenhum usuário, conta
 * ou dado de saúde é persistido para chegar aqui — o Auth.js cancela
 * o fluxo antes de qualquer escrita (ver src/auth/config.ts).
 */
export default async function AcessoRestritoPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-background px-6 py-12 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-headline-md font-bold text-on-surface-strong">
          Acesso restrito
        </h1>
        <p className="max-w-sm text-body-md text-muted-foreground">
          {email ? (
            <>
              O e-mail <span className="text-on-surface">{email}</span> não
              está autorizado a usar o Athlyt nesta versão.
            </>
          ) : (
            "Este e-mail não está autorizado a usar o Athlyt nesta versão."
          )}
        </p>
        <p className="max-w-sm text-body-sm text-muted-foreground">
          Nenhum dado foi salvo. O app é de uso pessoal e restrito a uma
          lista de e-mails autorizados.
        </p>
      </div>

      <Button asChild variant="secondary">
        <Link href="/">Sair</Link>
      </Button>
    </main>
  );
}
