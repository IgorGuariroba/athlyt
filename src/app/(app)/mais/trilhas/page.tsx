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

function formatarRotulo(chave: string) {
  const texto = chave
    .replace(/([a-zà-ú])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function ValorAuditavel({ valor }: { valor: unknown }) {
  if (valor === null || valor === undefined || valor === "") {
    return <span className="text-muted-foreground">Não informado</span>;
  }

  if (typeof valor === "boolean") return <span>{valor ? "Sim" : "Não"}</span>;
  if (typeof valor !== "object") {
    return <span className="whitespace-pre-wrap break-words">{String(valor)}</span>;
  }

  if (Array.isArray(valor)) {
    if (valor.length === 0) return <span className="text-muted-foreground">Nenhum item</span>;
    return (
      <ol className="flex flex-col gap-2">
        {valor.map((item, indice) => (
          <li key={indice} className="rounded-md border border-border bg-surface-container px-3 py-2">
            <span className="mb-1 block text-label-md text-muted-foreground">Item {indice + 1}</span>
            <ValorAuditavel valor={item} />
          </li>
        ))}
      </ol>
    );
  }

  return (
    <dl className="flex flex-col divide-y divide-border">
      {Object.entries(valor as Record<string, unknown>).map(([chave, item]) => (
        <div key={chave} className="flex min-w-0 flex-col gap-1 py-2 first:pt-0 last:pb-0">
          <dt className="text-label-md font-semibold text-muted-foreground">{formatarRotulo(chave)}</dt>
          <dd className="min-w-0 border-l border-border pl-3 text-body-sm text-on-surface"><ValorAuditavel valor={item} /></dd>
        </div>
      ))}
    </dl>
  );
}

function ConteudoAuditavel({ titulo, valor }: { titulo: string; valor: unknown }) {
  const conteudoBruto = typeof valor === "string" ? valor : JSON.stringify(valor, null, 2);
  return (
    <section className="flex flex-col gap-2">
      <strong className="text-label-lg text-on-surface-strong">{titulo}</strong>
      <div className="rounded-lg bg-muted p-3">
        <ValorAuditavel valor={valor} />
      </div>
      {typeof valor === "object" && valor !== null ? (
        <details className="text-body-sm text-muted-foreground">
          <summary className="cursor-pointer font-semibold">Ver dados brutos (JSON)</summary>
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3">
            {conteudoBruto}
          </pre>
        </details>
      ) : null}
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
          <div className="flex flex-col gap-4">
            {trilhas.map((trilha, indice) => {
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
                <CartaoLista key={trilha.id}>
                  <LinhasCartaoLista>
                    <LinhaCartaoLista
                      titulo={`Envio ${indice + 1} de ${trilhas.length} — ${
                        trilha.operacao === "plano-inicial"
                          ? "Plano inicial"
                          : trilha.operacao
                      }`}
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
                  </LinhasCartaoLista>
                </CartaoLista>
              );
            })}
          </div>
        )}
      </SecoesTela>

      <NotaTela>
        Uma trilha marcada como não auditável indica que a decisão não pôde ser
        reconstruída integralmente a partir dos dados registrados.
      </NotaTela>
    </TelaConteudo>
  );
}
