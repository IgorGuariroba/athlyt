import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarraAcaoFixa,
  CabecalhoTela,
  CartaoLista,
  FaixaDados,
  LinhaCartaoLista,
  LinhasCartaoLista,
  NotaTela,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { decidirPropostaRevisao, desfazerRevisao } from "../actions";
import { obterRevisaoAtual } from "../dados";

const ROTULO = {
  manter: "Manter Plano Ativo",
  auto_aplicado: "Ajuste auto-aplicado",
  estrutural: "Proposta estrutural",
};

export default async function PropostaPage() {
  const revisao = await obterRevisaoAtual();
  if (!revisao) redirect("/progresso/revisao");

  const aguardandoDecisao =
    revisao.proposta.exigeAprovacao && revisao.estado === "pendente";

  return (
    <TelaConteudo comAcaoFixa>
      <CabecalhoTela
        contexto="Revisão semanal · 4/4"
        titulo={ROTULO[revisao.proposta.tipo]}
        voltar={{
          href: "/progresso/revisao/evidencias",
          rotulo: "Voltar às evidências",
        }}
        acao={<Badge variant="outline">{revisao.estado}</Badge>}
      />

      <SecoesTela>
        <CartaoLista>
          <LinhasCartaoLista>
            <LinhaCartaoLista titulo="Justificativa">
              <p className="text-body-md leading-relaxed text-on-surface">
                {revisao.proposta.justificativa}
              </p>
            </LinhaCartaoLista>
            {revisao.proposta.ajuste ? (
              <LinhaCartaoLista titulo="Limite do ajuste">
                <FaixaDados>
                  {revisao.proposta.ajuste.limitePercentual}% · regra{" "}
                  {revisao.proposta.ajuste.regraVersao}
                </FaixaDados>
              </LinhaCartaoLista>
            ) : null}
          </LinhasCartaoLista>
        </CartaoLista>

        {aguardandoDecisao ? (
          <div className="grid grid-cols-2 gap-2">
            <form action={decidirPropostaRevisao}>
              <input type="hidden" name="reviewId" value={revisao.id} />
              <input type="hidden" name="decisao" value="aprovar" />
              <Button className="w-full">Criar rascunho</Button>
            </form>
            <form action={decidirPropostaRevisao}>
              <input type="hidden" name="reviewId" value={revisao.id} />
              <input type="hidden" name="decisao" value="rejeitar" />
              <Button className="w-full" variant="outline">
                Rejeitar
              </Button>
            </form>
          </div>
        ) : null}

        {revisao.estado === "aplicada" && revisao.baselinePlanId ? (
          <form action={desfazerRevisao}>
            <input type="hidden" name="reviewId" value={revisao.id} />
            <Button variant="outline" className="w-full">
              Desfazer proposta
            </Button>
          </form>
        ) : null}
      </SecoesTela>

      <NotaTela>
        Mudanças estruturais nunca são ativadas sem revisão e aprovação
        explícita.
      </NotaTela>

      <BarraAcaoFixa>
        <Button asChild size="cta">
          <Link href="/progresso">Concluir revisão</Link>
        </Button>
      </BarraAcaoFixa>
    </TelaConteudo>
  );
}
