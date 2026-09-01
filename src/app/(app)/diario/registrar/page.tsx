import Link from "next/link";
import { ArrowLeft, Camera, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { FUSO_PADRAO, horaLocal } from "@/domain/diario/dia-alimentar";
import { hojeDoUsuario, obterEntradaPlanejada } from "@/domain/diario/repositorio";
import { listarFavoritos, listarRecorrentes } from "@/domain/alimentos/repositorio";
import { favoritarAction, registrarPratoAction, salvarAlimentoProprioAction } from "../actions";
import { Atalhos } from "./atalhos";

/**
 * Painel de Atalhos de Registro — rota própria em vez de
 * modal: a tela é endereçável, sobrevive a recarregar e mantém o dia
 * escolhido explícito na URL.
 */
export default async function RegistrarPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; refeicao?: string }>;
}) {
  const { dia: diaParam, refeicao } = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;
  const fuso = FUSO_PADRAO;
  const dia = diaParam ?? hojeDoUsuario(fuso);
  const refeicaoRef = refeicao ? decodeURIComponent(refeicao) : null;
  const [favoritos, recorrentes, planejada] = userId
    ? await Promise.all([listarFavoritos(userId), listarRecorrentes(userId), refeicaoRef ? obterEntradaPlanejada(userId, refeicaoRef) : null])
    : [[], [], null];

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

      {/* A foto vive acima das abas de propósito: ela não é mais um
          método de busca, é o caminho de quem não quer buscar nada.
          Dentro do painel de abas ela competiria em igualdade com
          "Manual", que é o oposto do esforço que ela poupa. */}
      <div className="shrink-0 px-4 pb-3">
        <Button asChild variant="outline" className="h-14 w-full justify-between">
          <Link href={`/diario/registrar/foto?dia=${dia}`}>
            <span className="flex items-center gap-3">
              <Camera className="size-5" aria-hidden="true" />
              <span className="flex flex-col items-start">
                <span className="text-label-lg text-on-surface-strong">Fotografar o prato</span>
                <span className="text-caption text-muted-foreground">
                  o agent identifica e estima os macros
                </span>
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <Atalhos
        dia={dia}
        fuso={fuso}
        favoritos={favoritos}
        recorrentes={recorrentes}
        refeicaoRef={refeicaoRef}
        horaInicial={planejada?.horaLocal ?? horaLocal(new Date(), fuso)}
        nomeInicial={planejada?.nome}
        registrar={registrarPratoAction}
        favoritar={favoritarAction}
        salvarProprio={salvarAlimentoProprioAction}
      />
    </div>
  );
}
