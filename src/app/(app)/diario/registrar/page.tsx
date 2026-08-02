import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { FUSO_PADRAO } from "@/domain/diario/dia-alimentar";
import { hojeDoUsuario } from "@/domain/diario/repositorio";
import { listarFavoritos, listarRecorrentes } from "@/domain/alimentos/repositorio";
import { favoritarAction, registrarPratoAction } from "../actions";
import { Atalhos } from "./atalhos";

/**
 * Painel de Atalhos de Registro (tela 050) — rota própria em vez de
 * modal: a tela é endereçável, sobrevive a recarregar e mantém o dia
 * escolhido explícito na URL.
 */
export default async function RegistrarPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  const { dia: diaParam } = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;
  const fuso = FUSO_PADRAO;
  const dia = diaParam ?? hojeDoUsuario(fuso);
  const [favoritos, recorrentes] = userId
    ? await Promise.all([listarFavoritos(userId), listarRecorrentes(userId)])
    : [[], []];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between p-4 pb-2">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/diario?dia=${dia}`} aria-label="Voltar">
            <ArrowLeft />
          </Link>
        </Button>
        <p className="text-label-md font-semibold tracking-wider text-muted-foreground uppercase">
          Registrar alimento
        </p>
        <span className="size-10" />
      </header>

      <Atalhos
        dia={dia}
        fuso={fuso}
        favoritos={favoritos}
        recorrentes={recorrentes}
        registrar={registrarPratoAction}
        favoritar={favoritarAction}
      />
    </div>
  );
}
