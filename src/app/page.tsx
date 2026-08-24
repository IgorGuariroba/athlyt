import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { entrarComGoogle, entrarComoUsuarioDev } from "./(auth)/actions";
import { Button } from "@/components/ui/button";

/**
 * Tela 001 — Boas-vindas (specs/workflow/telas/001-boas-vindas.md).
 * Única forma de acesso: conta Google. Sessão já ativa pula direto
 * para o Início.
 */
export default async function BoasVindasPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/inicio");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-between bg-background px-6 py-12 text-center">
      <div />

      <div className="flex flex-col items-center gap-3">
        <h1 className="text-headline-lg font-bold tracking-tight text-on-surface-strong">
          Athlyt
        </h1>
        <p className="max-w-xs text-body-lg text-muted-foreground">
          Seu coach adaptativo pessoal de treino, alimentação e evolução
          corporal.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <form action={entrarComGoogle} className="w-full">
          <Button type="submit" size="lg" className="h-12 w-full text-base">
            Entrar com Google
          </Button>
        </form>
        {process.env.NODE_ENV === "development" && (
          <form action={entrarComoUsuarioDev} className="w-full">
            <Button type="submit" variant="outline" size="lg" className="h-12 w-full">
              Entrar como usuário de teste
            </Button>
          </form>
        )}
        <p className="text-body-sm text-muted-foreground">
          O Athlyt não é um serviço médico, nutricional ou de emergência.
        </p>
      </div>
    </main>
  );
}
