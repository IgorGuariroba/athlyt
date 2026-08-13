import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AvisoAcao,
  CabecalhoSecao,
  CabecalhoTela,
  CartaoLista,
  EstadoVazio,
  LinhaCartaoLista,
  LinhasCartaoLista,
  NotaTela,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { db } from "@/db/client";
import { consents } from "@/db/schema";
import { revogarIAVisual, revogarStorageFotos } from "./actions";

/**
 * Consentimentos por operação, revogáveis separadamente. O histórico
 * fica visível abaixo: revogar afeta usos futuros e não apaga o
 * registro do que já foi consentido.
 */
export default async function ConsentimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ sucesso?: string; erro?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const aviso = await searchParams;

  const linhas = await db
    .select()
    .from(consents)
    .where(eq(consents.userId, session.user.id))
    .orderBy(desc(consents.concedidoEm));

  const visualAtivo = linhas.some(
    (item) => item.operacao === "avaliacao-visual" && !item.revogadoEm,
  );
  const storageAtivo = linhas.some(
    (item) =>
      item.operacao === "foto-corporal-armazenamento" && !item.revogadoEm,
  );

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Mais"
        titulo="Consentimentos"
        descricao="Revogar afeta usos futuros sem apagar a Trilha de Decisão histórica."
        voltar={{ href: "/mais", rotulo: "Voltar para Mais" }}
      />

      <SecoesTela>
        {aviso.sucesso ? (
          <AvisoAcao tipo="sucesso">{aviso.sucesso}</AvisoAcao>
        ) : null}
        {aviso.erro ? <AvisoAcao tipo="erro">{aviso.erro}</AvisoAcao> : null}

        <CartaoLista>
          <LinhasCartaoLista>
            <LinhaCartaoLista
              titulo="Armazenamento de fotos"
              meta="Cloudflare R2 privado"
              valor={
                <Badge variant={storageAtivo ? "secondary" : "outline"}>
                  {storageAtivo ? "Ativo" : "Não concedido"}
                </Badge>
              }
            >
              {storageAtivo ? (
                <form action={revogarStorageFotos}>
                  <Button variant="destructive" size="sm">
                    Revogar e excluir fotos
                  </Button>
                </form>
              ) : null}
            </LinhaCartaoLista>

            <LinhaCartaoLista
              titulo="Análise visual por IA"
              meta="OpenRouter"
              valor={
                <Badge variant={visualAtivo ? "secondary" : "outline"}>
                  {visualAtivo ? "Ativo" : "Não concedido"}
                </Badge>
              }
            >
              {visualAtivo ? (
                <form action={revogarIAVisual}>
                  <Button variant="outline" size="sm">
                    Revogar análise futura
                  </Button>
                </form>
              ) : null}
            </LinhaCartaoLista>
          </LinhasCartaoLista>
        </CartaoLista>

        <section className="flex flex-col gap-3">
          <CabecalhoSecao titulo="Histórico" />
          {linhas.length === 0 ? (
            <EstadoVazio
              titulo="Nenhum consentimento registrado"
              descricao="Cada concessão e revogação aparece aqui, com a versão do recorte aplicado."
            />
          ) : (
            <CartaoLista>
              <LinhasCartaoLista>
                {linhas.slice(0, 20).map((item) => (
                  <LinhaCartaoLista
                    key={item.id}
                    titulo={item.operacao}
                    meta={`${item.campo} · recorte v${item.recorteVersao}`}
                    valor={
                      <Badge variant="outline">
                        {item.revogadoEm
                          ? `Revogado ${item.revogadoEm.toLocaleDateString("pt-BR")}`
                          : "Vigente"}
                      </Badge>
                    }
                  />
                ))}
              </LinhasCartaoLista>
            </CartaoLista>
          )}
        </section>
      </SecoesTela>

      <NotaTela>
        A Trilha de Decisão preserva o que foi usado enquanto o consentimento
        esteve vigente — revogar não reescreve o passado.
      </NotaTela>
    </TelaConteudo>
  );
}
