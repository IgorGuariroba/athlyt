import { GitBranch } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import {
  CabecalhoTela,
  CartaoLista,
  EstadoVazio,
  FaixaDados,
  LinhaCartaoLista,
  LinhasCartaoLista,
  NotaTela,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { listarTrilhas } from "@/domain/ia/trilha";

function ConteudoAuditavel({ titulo, valor }: { titulo: string; valor: unknown }) {
  const conteudo = typeof valor === "string" ? valor : JSON.stringify(valor, null, 2);
  return (
    <section className="flex flex-col gap-2">
      <strong className="text-label-lg text-on-surface-strong">{titulo}</strong>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-body-sm text-muted-foreground">
        {conteudo || "Nenhum"}
      </pre>
    </section>
  );
}

/**
 * Trilhas de Decisão: o que cada recomendação usou como entrada e qual
 * regra ou modelo a produziu. É a superfície de auditoria do produto,
 * então nada aqui é resumido a ponto de perder a rastreabilidade.
 */
export default async function TrilhasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const trilhas = await listarTrilhas(session.user.id);

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Mais"
        titulo="Trilhas de Decisão"
        descricao="Dados, regras e resultados que sustentaram cada recomendação."
        voltar={{ href: "/mais", rotulo: "Voltar para Mais" }}
      />

      <SecoesTela>
        {trilhas.length === 0 ? (
          <EstadoVazio
            Icone={GitBranch}
            titulo="Nenhuma decisão registrada"
            descricao="Assim que o Athlyt gerar um plano ou ajuste, o caminho até a decisão aparece aqui."
          />
        ) : (
          <CartaoLista>
            <LinhasCartaoLista>
              {trilhas.map((trilha) => {
                const resultado = trilha.resultado as Record<
                  string,
                  unknown
                > | null;
                const campos =
                  (trilha.camposEnviados as string[]).join(", ") || "nenhum";
                const ferramentas = trilha.ferramentasConsultadas as Array<{
                  nome: string;
                  argumentos: unknown;
                  resultado?: unknown;
                }>;

                return (
                  <LinhaCartaoLista
                    key={trilha.id}
                    titulo={
                      trilha.operacao === "plano-inicial"
                        ? "Plano inicial"
                        : trilha.operacao
                    }
                    meta={trilha.createdAt.toLocaleString("pt-BR")}
                    valor={
                      <Badge variant={trilha.auditavel ? "secondary" : "outline"}>
                        {trilha.auditavel ? "Auditável" : "Não auditável"}
                      </Badge>
                    }
                  >
                    <div className="flex flex-col gap-5">
                      <FaixaDados>
                        Modelo solicitado: {trilha.modeloSolicitado} · Modelo resolvido: {trilha.modeloResolvido ?? "não informado"} · perfil v{trilha.perfilVersao}
                      </FaixaDados>
                      <p className="text-body-sm text-muted-foreground">
                        Origem: {trilha.origemTela ?? "não registrada"} · {trilha.origemRota ?? "rota não registrada"} · {trilha.gatilho ?? "gatilho não registrado"}
                      </p>
                      <p className="text-body-sm text-muted-foreground">
                        Campos enviados: {campos}
                      </p>
                      <ConteudoAuditavel titulo="Contexto estruturado enviado" valor={trilha.contextoEnviado} />
                      <ConteudoAuditavel titulo="Instrução de sistema" valor={trilha.instrucaoSistema} />
                      <ConteudoAuditavel titulo="Prompt enviado ao agent" valor={trilha.promptEnviado} />
                      <ConteudoAuditavel titulo={`Ferramentas chamadas (${ferramentas.length})`} valor={ferramentas} />
                      <ConteudoAuditavel titulo="Retorno do agent" valor={resultado ?? trilha.erro ?? "Nenhum retorno registrado"} />
                    </div>
                  </LinhaCartaoLista>
                );
              })}
            </LinhasCartaoLista>
          </CartaoLista>
        )}
      </SecoesTela>

      <NotaTela>
        Uma trilha marcada como não auditável indica que a decisão não pôde ser
        reconstruída integralmente a partir dos dados registrados.
      </NotaTela>
    </TelaConteudo>
  );
}
