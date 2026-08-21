import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Check, Circle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  BarraAcaoFixa,
  CabecalhoSecao,
  CabecalhoTela,
  CartaoLista,
  ItemNavegacao,
  ListaNavegacao,
  Metrica,
  PainelMetricas,
  Revelar,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { montarResumoTriagem } from "@/domain/triagem/resumo";
import { ETAPAS_TRIAGEM } from "@/domain/triagem/etapas";
import { TransicaoEtapa } from "@/components/tela/transicao-etapa";
import { gerarPlanoInicialAction } from "@/app/(auth)/plano/actions";
import { obterRecorte } from "@/domain/ia/contexto/recortes";
import { textoConsentimentoDe } from "@/domain/ia/contexto/montagem";
import { NOME_PROVEDOR } from "@/domain/ia/provedor";
import { BotaoGerarPlano } from "./botao-gerar-plano";

/**
 * Tela 024 — Resumo da triagem (specs/workflow/telas/024-resumo-
 * triagem.md). Checklist do que foi preenchido, o que falta e o que
 * cada dado destrava; declara o estado do Modo Conservador (user
 * stories 6, 14, 15).
 *
 * O resumo desemboca na geração do Plano Ativo pelo agent (tela 025).
 */
export default async function ResumoTriagemPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/");
  }

  const perfil = await obterPerfilVigente(userId);
  const resumo = montarResumoTriagem(perfil?.respostas ?? {});
  const { erro } = await searchParams;
  const consentimento = textoConsentimentoDe(
    [obterRecorte("plano-treino"), obterRecorte("plano-nutricao")],
    NOME_PROVEDOR,
  );

  const preenchidos = resumo.itens.filter((item) => item.respondida).length;
  const pendentes = resumo.itens.length - preenchidos;

  return (
    <TelaConteudo comAcaoFixa>
      {/* Fim da cascata: entra sempre no sentido do avanço. */}
      <TransicaoEtapa indice={ETAPAS_TRIAGEM.length + 1}>
        <CabecalhoTela
          contexto="Triagem concluída"
          titulo="Seu perfil em resumo"
          descricao="Confira os dados usados para montar uma estratégia segura e personalizada."
          acao={
            resumo.modoConservador ? (
              <Badge variant="secondary">Modo conservador</Badge>
            ) : (
              <Badge>Perfil completo</Badge>
            )
          }
        />

        <SecoesTela>
          <PainelMetricas className="grid-cols-2">
            <Metrica valor={preenchidos} rotulo="dados preenchidos" />
            <Metrica valor={pendentes} rotulo="itens pendentes" />
          </PainelMetricas>

          {resumo.modoConservador ? (
            <CartaoLista className="border-warning/40 bg-warning/10 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-warning"
                />
                <div className="flex flex-col gap-1">
                  <strong className="text-label-lg text-on-surface-strong">
                    Estratégia conservadora
                  </strong>
                  <p className="text-body-sm leading-relaxed text-muted-foreground">
                    Enquanto faltarem dados obrigatórios, o Athlyt mantém apenas
                    orientações de baixo risco, sem estratégia energética agressiva.
                  </p>
                </div>
              </div>
            </CartaoLista>
          ) : null}

          {erro ? (
            <CartaoLista className="border-destructive/40 p-4 text-body-sm text-destructive">
              {erro}
            </CartaoLista>
          ) : null}

          <section aria-labelledby="dados-triagem" className="flex flex-col gap-3">
            <CabecalhoSecao
              id="dados-triagem"
              titulo="Dados da triagem"
              descricao={`${preenchidos} de ${resumo.itens.length} preenchidos. Toque em um item para revisar.`}
            />
            <ListaNavegacao>
              {resumo.itens.map((item) => (
                <ItemNavegacao
                  key={item.id}
                  href={`/triagem/${item.id}?retorno=/triagem/resumo`}
                  rotulo={item.titulo}
                  descricao={
                    item.respondida
                      ? item.obrigatoria
                        ? undefined
                        : "Opcional"
                      : item.destrava
                  }
                  valor={
                    <span
                      className={
                        item.respondida
                          ? "flex items-center gap-2 text-success"
                          : "flex items-center gap-2 text-muted-foreground"
                      }
                    >
                      {item.respondida ? (
                        <Check aria-hidden="true" className="size-4" />
                      ) : (
                        <Circle aria-hidden="true" className="size-4" />
                      )}
                      {item.respondida ? "Pronto" : "Pendente"}
                    </span>
                  }
                />
              ))}
            </ListaNavegacao>
          </section>
        </SecoesTela>
      </TransicaoEtapa>

      <BarraAcaoFixa>
        <form action={gerarPlanoInicialAction} className="flex w-full flex-col gap-3">
          <div className="flex items-start gap-3">
            <Checkbox id="consentimentoIA" name="consentimentoIA" value="sim" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <Label
                htmlFor="consentimentoIA"
                className="text-body-sm leading-relaxed font-normal text-muted-foreground"
              >
                Autorizo o uso destes dados para gerar meu plano com IA.
              </Label>
              <div className="mt-2">
                <Revelar rotulo="Ver finalidade e dados enviados">
                  <p className="whitespace-pre-line">{consentimento}</p>
                </Revelar>
              </div>
            </div>
          </div>
          <BotaoGerarPlano />
        </form>
      </BarraAcaoFixa>
    </TelaConteudo>
  );
}
