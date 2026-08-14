import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CartaoLista } from "@/components/tela";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { montarResumoTriagem } from "@/domain/triagem/resumo";
import { ETAPAS_TRIAGEM } from "@/domain/triagem/etapas";
import { TransicaoEtapa } from "../_components/transicao-etapa";

/**
 * Tela 024 — Resumo da triagem (specs/workflow/telas/024-resumo-
 * triagem.md). Checklist do que foi preenchido, o que falta e o que
 * cada dado destrava; declara o estado do Modo Conservador (user
 * stories 6, 14, 15).
 *
 * O resumo desemboca na geração determinística do Plano Ativo (tela 025).
 */
export default async function ResumoTriagemPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/");
  }

  const perfil = await obterPerfilVigente(userId);
  const resumo = montarResumoTriagem(perfil?.respostas ?? {});

  return (
    <main className="flex flex-1 flex-col gap-6 bg-background px-6 py-8">
      {/* Fim da cascata: entra sempre no sentido do avanço. */}
      <TransicaoEtapa indice={ETAPAS_TRIAGEM.length + 1}>
        <div className="flex items-center justify-between">
          <h1 className="text-headline-md font-bold text-on-surface-strong">
            Resumo da triagem
          </h1>
          {resumo.modoConservador ? (
            <Badge variant="secondary">Modo Conservador</Badge>
          ) : (
            <Badge>Perfil completo</Badge>
          )}
        </div>

        {resumo.modoConservador ? (
          <CartaoLista className="p-4">
            <p className="text-body-md text-on-surface">
              Enquanto os dados obrigatórios não estiverem completos, o Athlyt
              oferece apenas orientações de baixo risco, sem estratégia
              energética agressiva.
            </p>
          </CartaoLista>
        ) : null}

        <ul className="flex flex-col gap-2">
          {resumo.itens.map((item) => (
            <li key={item.id}>
              <CartaoLista className="flex flex-row items-center justify-between p-4">
                <div className="flex flex-col">
                  <span className="text-body-md text-on-surface">
                    {item.titulo}
                    {!item.obrigatoria && (
                      <span className="ml-2 text-body-sm text-muted-foreground">
                        (opcional)
                      </span>
                    )}
                  </span>
                  {!item.respondida ? (
                    <span className="text-body-sm text-muted-foreground">
                      {item.destrava}
                    </span>
                  ) : null}
                </div>
                <Badge variant={item.respondida ? "default" : "outline"}>
                  {item.respondida ? "Preenchido" : "Pendente"}
                </Badge>
              </CartaoLista>
            </li>
          ))}
        </ul>

        <Button asChild size="lg" className="h-12 w-full">
          <Link href="/plano/gerando">Gerar meu plano</Link>
        </Button>
      </TransicaoEtapa>
    </main>
  );
}
