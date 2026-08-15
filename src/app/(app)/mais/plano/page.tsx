import { redirect } from "next/navigation";
import { Dumbbell } from "lucide-react";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import {
  AvisoAcao,
  CabecalhoCartaoLista,
  CabecalhoTela,
  CartaoLista,
  LinhaCartaoLista,
  LinhasCartaoLista,
  NotaTela,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { obterReavaliacaoEmAnalise } from "@/domain/plano/reavaliacao";
import {
  obterExperimentoAtivo,
  obterPlanoAtivo,
  obterRascunho,
} from "@/domain/plano/repositorio";
import { gerarNovoPlanoAtivoAction } from "../../../(auth)/plano/actions";
import { BotaoRegenerarPlano } from "../../../(auth)/plano/revisao/botao-regenerar-plano";

export default async function PlanoAtivoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [planoAtivo, rascunho, experimento, reavaliacao, { erro }] =
    await Promise.all([
      obterPlanoAtivo(session.user.id),
      obterRascunho(session.user.id),
      obterExperimentoAtivo(session.user.id),
      obterReavaliacaoEmAnalise(session.user.id),
      searchParams,
    ]);

  if (experimento || (rascunho && reavaliacao)) {
    redirect("/progresso/revisao/experimento");
  }
  if (rascunho) redirect("/plano/revisao");
  if (!planoAtivo) redirect("/triagem/resumo");

  const { bloco } = planoAtivo.conteudo;
  const totalExercicios = bloco.dias.reduce(
    (total, dia) => total + dia.exercicios.length,
    0,
  );

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Plano e estratégia"
        titulo="Refazer seu Plano Ativo"
        descricao="Peça outra sugestão ao agent com os dados atuais do seu perfil e revise tudo antes de decidir pela troca."
        voltar={{ href: "/mais", rotulo: "Voltar para Mais" }}
        acao={<Badge variant="secondary">Versão {planoAtivo.versao}</Badge>}
      />

      <SecoesTela>
        <CartaoLista aria-labelledby="plano-atual-titulo">
          <CabecalhoCartaoLista
            id="plano-atual-titulo"
            titulo={bloco.divisao}
            meta="Seu plano atual continua ativo"
            Icone={Dumbbell}
          />
          <LinhasCartaoLista>
            <LinhaCartaoLista
              titulo="Treinos por semana"
              valor={bloco.dias.length}
            />
            <LinhaCartaoLista
              titulo="Exercícios no bloco"
              valor={totalExercicios}
            />
            <LinhaCartaoLista
              titulo="Duração"
              valor={`${bloco.duracaoSemanas} semanas`}
            />
          </LinhasCartaoLista>
        </CartaoLista>

        <section aria-labelledby="nova-sugestao-titulo" className="flex flex-col gap-3">
          <div>
            <h2
              id="nova-sugestao-titulo"
              className="text-title-lg font-bold text-on-surface-strong"
            >
              Gerar uma nova sugestão
            </h2>
            <p className="mt-1 text-body-sm leading-relaxed text-muted-foreground">
              O agent usará os mesmos dados disponíveis no seu perfil. Você poderá revisar e trocar exercícios antes de ativar o novo plano.
            </p>
          </div>

          <form action={gerarNovoPlanoAtivoAction} className="flex flex-col gap-3">
            {erro ? <AvisoAcao tipo="erro">{erro}</AvisoAcao> : null}
            <BotaoRegenerarPlano />
          </form>
        </section>
      </SecoesTela>

      <NotaTela>
        Nada muda imediatamente: o plano atual só será substituído depois que a nova geração terminar e você confirmar a ativação.
      </NotaTela>
    </TelaConteudo>
  );
}
