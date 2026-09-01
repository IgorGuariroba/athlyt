import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";

import { BarraAcaoFixa } from "@/components/tela/barra-acao-fixa";
import { CabecalhoTela } from "@/components/tela/cabecalho-tela";
import { SecoesTela, TelaConteudo } from "@/components/tela/tela-conteudo";
import { Button } from "@/components/ui/button";

/**
 * Acesso restrito. Alcançada pelo redirect do callback signIn quando
 * o e-mail autenticado no Google não está na allowlist. Nenhum usuário, conta
 * ou dado de saúde é persistido para chegar aqui — o Auth.js cancela
 * o fluxo antes de qualquer escrita (ver src/auth/config.ts).
 */
export default async function AcessoRestritoPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  const descricao = email
    ? `O e-mail ${email} não está autorizado a usar o Athlyt nesta versão.`
    : "Este e-mail não está autorizado a usar o Athlyt nesta versão.";

  return (
    <TelaConteudo comAcaoFixa>
      <div className="flex min-h-48 items-end px-6 pb-2">
        <div className="flex size-16 items-center justify-center rounded-lg border border-border bg-surface-container">
          <LockKeyhole aria-hidden="true" className="size-7 text-on-surface" />
        </div>
      </div>

      <CabecalhoTela
        contexto="Acesso ao Athlyt"
        titulo="Acesso restrito"
        descricao={descricao}
        className="pt-4"
      />

      <SecoesTela>
        <div className="flex gap-3 rounded-lg border border-border bg-surface-container p-4">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
          />
          <div className="flex flex-col gap-1">
            <p className="text-label-lg text-on-surface">Seus dados estão seguros</p>
            <p className="text-body-sm leading-relaxed text-muted-foreground">
              Nenhum dado foi salvo. Esta versão é de uso pessoal e restrita
              a uma lista de e-mails autorizados.
            </p>
          </div>
        </div>
      </SecoesTela>

      <BarraAcaoFixa>
        <Button asChild size="cta">
          <Link href="/">Sair</Link>
        </Button>
      </BarraAcaoFixa>
    </TelaConteudo>
  );
}
