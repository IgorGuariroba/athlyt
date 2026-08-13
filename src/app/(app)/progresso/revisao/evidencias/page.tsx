import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarraAcaoFixa,
  CabecalhoTela,
  CartaoLista,
  EstadoVazio,
  LinhaCartaoLista,
  LinhasCartaoLista,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { obterRevisaoAtual } from "../dados";

/**
 * Evidências que sustentam ou enfraquecem a leitura da semana. A
 * divergência é o conteúdo: itens "a favor" e "contra" convivem na
 * mesma lista, sem fusão em um veredito.
 */
export default async function EvidenciasPage() {
  const revisao = await obterRevisaoAtual();
  if (!revisao) redirect("/progresso/revisao");

  return (
    <TelaConteudo comAcaoFixa>
      <CabecalhoTela
        contexto="Revisão semanal · 3/4"
        titulo="Evidências e incertezas"
        descricao="Divergências continuam visíveis em vez de serem fundidas."
        voltar={{
          href: "/progresso/revisao/scorecard",
          rotulo: "Voltar ao scorecard",
        }}
      />

      <SecoesTela>
        {revisao.evidencias.length === 0 ? (
          <EstadoVazio
            titulo="Sem evidências registradas"
            descricao="A revisão precisa de registros da semana para sustentar uma leitura."
          />
        ) : (
          <CartaoLista>
            <LinhasCartaoLista>
              {revisao.evidencias.map((item) => {
                const contexto = [
                  item.fonte,
                  item.metodo,
                  item.protocolo,
                  item.observadoEm
                    ? new Date(item.observadoEm).toLocaleDateString("pt-BR")
                    : undefined,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <LinhaCartaoLista
                    key={item.descricao}
                    titulo={item.descricao}
                    meta={contexto}
                    valor={
                      <Badge
                        variant="outline"
                        className={
                          item.sentido === "favor"
                            ? "border-success/40 text-success"
                            : "border-warning/40 text-warning"
                        }
                      >
                        {item.sentido === "favor" ? "Sustenta" : "Enfraquece"}
                      </Badge>
                    }
                  >
                    <p className="text-body-sm text-muted-foreground">
                      Qualidade da evidência: {item.qualidade}
                    </p>
                  </LinhaCartaoLista>
                );
              })}
            </LinhasCartaoLista>
          </CartaoLista>
        )}

        <Button asChild variant="ghost" className="w-fit">
          <Link href="/mais/trilhas">Abrir Trilha de Decisão</Link>
        </Button>
      </SecoesTela>

      <BarraAcaoFixa>
        <Button asChild size="cta">
          <Link href="/progresso/revisao/proposta">Ver proposta</Link>
        </Button>
      </BarraAcaoFixa>
    </TelaConteudo>
  );
}
