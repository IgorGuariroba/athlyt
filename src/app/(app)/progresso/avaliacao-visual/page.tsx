import { ImageOff } from "lucide-react";
import { redirect } from "next/navigation";
import { obterSessaoAtual } from "@/auth/sessao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AvisoAcao,
  CabecalhoSecao,
  CabecalhoTela,
  CartaoLista,
  EstadoVazio,
  FaixaDados,
  GradeSelecaoFoto,
  ItemSelecaoFoto,
  LinhaCartaoLista,
  LinhasCartaoLista,
  MedidorScore,
  NotaTela,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { textoConsentimento } from "@/domain/ia/contexto/montagem";
import { obterRecorte } from "@/domain/ia/contexto/recortes";
import { NOME_PROVEDOR } from "@/domain/ia/provedor";
import { obterPanoramaCorporal } from "@/domain/medicoes/repositorio";
import { criarStorageR2 } from "@/infra/storage";
import { executarAvaliacaoVisual, revogarConsentimentoVisual } from "./actions";

/**
 * Avaliação visual: critérios separados, faixa probabilística de
 * gordura e limitações explícitas. Nunca um percentual exato nem uma
 * nota corporal única — a agregação apagaria a incerteza que é o
 * conteúdo mais honesto da leitura.
 */
export default async function AvaliacaoVisualPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const session = await obterSessaoAtual();
  if (!session?.user?.id) redirect("/");

  const aviso = await searchParams;
  const panorama = await obterPanoramaCorporal(session.user.id);
  const storage = criarStorageR2();
  const fotos = await Promise.all(
    panorama.fotos.slice(0, 12).map(async (foto) => ({
      ...foto,
      url: await storage.urlLeitura(foto.objectKey),
    })),
  );
  const ativa = panorama.avaliacoesVisuais.find((item) => item.ativa);
  const criterios = ativa ? Object.entries(ativa.criterios) : [];

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Avaliação visual"
        titulo="Critérios separados, sem nota corporal"
        descricao="Fotos nunca produzem um percentual exato nem alteram o Plano Ativo isoladamente."
        voltar={{ href: "/progresso", rotulo: "Voltar ao Progresso" }}
      />

      <SecoesTela>
        {aviso.erro ? <AvisoAcao tipo="erro">{aviso.erro}</AvisoAcao> : null}
        {aviso.sucesso ? (
          <AvisoAcao tipo="sucesso">{aviso.sucesso}</AvisoAcao>
        ) : null}

        {ativa ? (
          <section className="flex flex-col gap-3">
            <CabecalhoSecao
              titulo="Projeção vigente"
              acao={<Badge variant="outline">Confiança {ativa.confianca}</Badge>}
            />
            <CartaoLista>
              <LinhasCartaoLista>
                <LinhaCartaoLista titulo="Critérios">
                  <div className="flex flex-col gap-4 pt-1">
                    {criterios.map(([nome, nota]) => (
                      <MedidorScore
                        key={nome}
                        rotulo={nome.replace("vTaper", "V-taper")}
                        valor={nota}
                      />
                    ))}
                  </div>
                </LinhaCartaoLista>

                <LinhaCartaoLista titulo="Gordura visual">
                  <FaixaDados>
                    {(ativa.gorduraMinBasisPoints / 100).toLocaleString("pt-BR")}
                    –
                    {(ativa.gorduraMaxBasisPoints / 100).toLocaleString("pt-BR")}
                    % · faixa probabilística
                  </FaixaDados>
                </LinhaCartaoLista>

                {ativa.observacoes.length ? (
                  <LinhaCartaoLista titulo="Observações">
                    <ul className="flex flex-col gap-1">
                      {ativa.observacoes.map((texto) => (
                        <li key={texto} className="text-body-sm text-on-surface">
                          {texto}
                        </li>
                      ))}
                    </ul>
                  </LinhaCartaoLista>
                ) : null}

                {ativa.limitacoes.length ? (
                  <LinhaCartaoLista titulo="Limitações">
                    <p className="text-body-sm text-muted-foreground">
                      {ativa.limitacoes.join("; ")}
                    </p>
                  </LinhaCartaoLista>
                ) : null}
              </LinhasCartaoLista>
            </CartaoLista>

            <form action={revogarConsentimentoVisual}>
              <Button variant="destructive" size="sm">
                Revogar consentimento e projeção
              </Button>
            </form>
          </section>
        ) : null}

        <form action={executarAvaliacaoVisual} className="flex flex-col gap-5">
          <section className="flex flex-col gap-3">
            <CabecalhoSecao
              titulo="Selecione de 2 a 4 fotos"
              descricao="Poses diferentes da mesma data produzem leitura mais estável."
            />
            {fotos.length === 0 ? (
              <EstadoVazio
                Icone={ImageOff}
                titulo="Nenhuma foto disponível"
                descricao="Envie fotos privadas antes de solicitar uma avaliação visual."
              />
            ) : (
              <GradeSelecaoFoto>
                {fotos.map((foto) => (
                  <ItemSelecaoFoto
                    key={foto.id}
                    id={`foto-${foto.id}`}
                    name="fotoId"
                    value={foto.id}
                    src={foto.url}
                    alt={`Foto corporal ${foto.pose.replaceAll("_", " ")}`}
                    rotulo={foto.pose.replaceAll("_", " ")}
                    meta={foto.observadoEm.toLocaleDateString("pt-BR")}
                  />
                ))}
              </GradeSelecaoFoto>
            )}
          </section>

          <CartaoLista>
            <LinhasCartaoLista>
              <LinhaCartaoLista titulo="O que será enviado">
                <p className="text-body-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {textoConsentimento(
                    obterRecorte("avaliacao-visual"),
                    NOME_PROVEDOR,
                  )}
                </p>
              </LinhaCartaoLista>
              <LinhaCartaoLista titulo="Autorização">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consentimentoIA"
                    name="consentimentoIA"
                    value="sim"
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="consentimentoIA"
                    className="text-body-sm leading-relaxed font-normal text-muted-foreground"
                  >
                    Autorizo este envio específico ao provedor de IA. Armazenar
                    fotos no R2 não concede esta autorização.
                  </Label>
                </div>
              </LinhaCartaoLista>
            </LinhasCartaoLista>
          </CartaoLista>

          <Button size="cta" disabled={fotos.length < 2}>
            Analisar fotos selecionadas
          </Button>
        </form>
      </SecoesTela>

      <NotaTela>
        A avaliação visual complementa medidas — nunca as substitui, e sozinha
        não altera o Plano Ativo.
      </NotaTela>
    </TelaConteudo>
  );
}
