import { redirect } from "next/navigation";
import { Dumbbell, Flame, RefreshCw } from "lucide-react";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/radio-group";
import {
  AvisoAcao,
  BarraAcaoFixa,
  CabecalhoTela,
  CartaoRadio,
  NotaTela,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { obterReavaliacaoPendente } from "@/domain/plano/reavaliacao";
import { OBJETIVOS_COMPOSICAO } from "@/domain/triagem/etapas";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { alterarObjetivoAtual } from "./actions";

const ICONE_OBJETIVO = {
  recomposicao: RefreshCw,
  "perder-gordura": Flame,
  "ganhar-massa": Dumbbell,
} as const;

export default async function ObjetivoAtualPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; aviso?: string; sucesso?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [perfil, reavaliacao, mensagens] = await Promise.all([
    obterPerfilVigente(session.user.id),
    obterReavaliacaoPendente(session.user.id),
    searchParams,
  ]);
  if (!perfil?.respostas.objetivoComposicao) redirect("/triagem/objetivo");

  return (
    <TelaConteudo comAcaoFixa>
      <CabecalhoTela
        contexto="Objetivo e estratégia"
        titulo="Qual é o seu objetivo atual?"
        descricao="Alterar o objetivo atualiza seu perfil, mas não troca o Plano Ativo sem uma Revisão Semanal."
        voltar={{ href: "/mais", rotulo: "Voltar para Mais" }}
        acao={reavaliacao ? <Badge variant="secondary">Reavaliação pendente</Badge> : null}
      />

      <form action={alterarObjetivoAtual}>
        <SecoesTela>
          {mensagens.erro ? <AvisoAcao tipo="erro">{mensagens.erro}</AvisoAcao> : null}
          {mensagens.aviso ? <AvisoAcao tipo="sucesso">{mensagens.aviso}</AvisoAcao> : null}
          {mensagens.sucesso ? <AvisoAcao tipo="sucesso">{mensagens.sucesso}</AvisoAcao> : null}

          <RadioGroup
            name="objetivoComposicao"
            defaultValue={perfil.respostas.objetivoComposicao}
            required
            className="gap-3"
          >
            {OBJETIVOS_COMPOSICAO.map(({ value, titulo, descricao }) => (
              <CartaoRadio
                key={value}
                id={`objetivo-atual-${value}`}
                value={value}
                titulo={titulo}
                descricao={descricao}
                Icone={ICONE_OBJETIVO[value]}
              />
            ))}
          </RadioGroup>
        </SecoesTela>

        <BarraAcaoFixa>
          <Button type="submit" size="cta" className="w-full">
            Salvar objetivo
          </Button>
        </BarraAcaoFixa>
      </form>

      <NotaTela>
        Mudanças estruturais declaram hipótese, variáveis e critérios antes de virar um Experimento de Plano. O plano vigente continua disponível durante a análise.
      </NotaTela>
    </TelaConteudo>
  );
}
