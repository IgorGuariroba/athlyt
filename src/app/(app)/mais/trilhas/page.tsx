import { GitBranch } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import {
  CabecalhoTela,
  CartaoLista,
  EstadoVazio,
  ExplicacaoAgent,
  FaixaDados,
  LinhaCartaoLista,
  LinhasCartaoLista,
  NotaTela,
  Revelar,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { listarTrilhas } from "@/domain/ia/trilha";
import type { ExplicacaoDecisao } from "@/domain/plano/tipos";

/**
 * As explicações dirigidas ao atleta chegam aqui dentro do retorno
 * bruto do agent, indistinguíveis do resto do JSON. Elas são o único
 * pedaço da trilha escrito *para* o atleta, e não sobre a chamada:
 * separá-las evita que a superfície de auditoria seja o único lugar
 * do produto onde a explicação existe mas ninguém consegue lê-la.
 */
function explicacaoDe(valor: unknown): ExplicacaoDecisao | null {
  const registro = valor as Record<string, unknown> | null;
  if (!registro || typeof registro !== "object") return null;
  const { porque, dadosUsados } = registro;
  return typeof porque === "string" && Array.isArray(dadosUsados)
    ? ({ porque, dadosUsados } as ExplicacaoDecisao)
    : null;
}

/**
 * `formatarRotulo` serve para chaves arbitrárias do JSON auditado, mas
 * quebraria as metas nutricionais em "Carboidratos g": a unidade que
 * vive no nome do campo não pertence a uma pergunta em voz humana.
 */
const PERGUNTA_META: Record<string, string> = {
  calorias: "Por que estas calorias?",
  proteinaG: "Por que esta meta de proteína?",
  carboidratosG: "Por que esta meta de carboidratos?",
  gordurasG: "Por que esta meta de gorduras?",
  estrategia: "Por que esta estratégia?",
};

function coletarExplicacoes(
  resultado: Record<string, unknown> | null,
): Array<{ pergunta: string; explicacao: ExplicacaoDecisao }> {
  if (!resultado) return [];
  const coletadas: Array<{ pergunta: string; explicacao: ExplicacaoDecisao }> = [];
  const adicionar = (pergunta: string, valor: unknown) => {
    const explicacao = explicacaoDe(valor);
    if (explicacao) coletadas.push({ pergunta, explicacao });
  };

  const bloco = resultado.bloco as Record<string, unknown> | undefined;
  adicionar("Por que esta divisão?", bloco?.explicacao);
  for (const dia of (bloco?.dias ?? []) as Array<Record<string, unknown>>) {
    adicionar(`Por que o dia ${dia.nome}?`, dia.explicacao);
    for (const exercicio of (dia.exercicios ?? []) as Array<Record<string, unknown>>) {
      adicionar(`Por que ${exercicio.nome}?`, exercicio.explicacao);
    }
  }

  const nutricao = resultado.nutricao as Record<string, unknown> | undefined;
  const explicacoes = nutricao?.explicacoes as Record<string, unknown> | undefined;
  for (const [chave, valor] of Object.entries(explicacoes ?? {})) {
    adicionar(PERGUNTA_META[chave] ?? `Por que ${formatarRotulo(chave)}?`, valor);
  }
  for (const refeicao of (nutricao?.refeicoes ?? []) as Array<Record<string, unknown>>) {
    adicionar(`Por que a refeição ${refeicao.nome}?`, refeicao.explicacao);
  }

  return coletadas;
}

function formatarRotulo(chave: string) {
  const texto = chave
    .replace(/([a-zà-ú])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Resumo de uma linha para o cabeçalho colapsado: sem ele o usuário
 * precisaria abrir cada nó para descobrir se vale a pena olhar.
 */
function resumir(valor: unknown): string {
  if (Array.isArray(valor)) {
    return `${valor.length} ${valor.length === 1 ? "item" : "itens"}`;
  }
  if (valor && typeof valor === "object") {
    const chaves = Object.keys(valor as Record<string, unknown>);
    return `${chaves.length} ${chaves.length === 1 ? "campo" : "campos"}`;
  }
  const texto = String(valor ?? "");
  return texto.length > 40 ? `${texto.slice(0, 40)}…` : texto;
}

function ValorAuditavel({
  valor,
  profundidade = 0,
}: {
  valor: unknown;
  profundidade?: number;
}) {
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
          <li key={indice} className="min-w-0 rounded-md border border-border bg-surface-container px-3 py-2">
            <Revelar rotulo={`Item ${indice + 1}`} meta={resumir(item)}>
              <ValorAuditavel valor={item} profundidade={profundidade + 1} />
            </Revelar>
          </li>
        ))}
      </ol>
    );
  }

  const entradas = Object.entries(valor as Record<string, unknown>);
  if (entradas.length === 0) {
    return <span className="text-muted-foreground">Nenhum campo</span>;
  }

  return (
    <dl className="flex flex-col divide-y divide-border">
      {entradas.map(([chave, item]) => {
        const composto = item !== null && typeof item === "object";
        return (
          <div key={chave} className="flex min-w-0 flex-col gap-1 py-2 first:pt-0 last:pb-0">
            {composto ? (
              <Revelar rotulo={formatarRotulo(chave)} meta={resumir(item)}>
                <div className="min-w-0 border-l border-border pl-3 text-body-sm text-on-surface">
                  <ValorAuditavel valor={item} profundidade={profundidade + 1} />
                </div>
              </Revelar>
            ) : (
              <>
                <dt className="text-label-md font-semibold text-muted-foreground">{formatarRotulo(chave)}</dt>
                <dd className="min-w-0 border-l border-border pl-3 text-body-sm text-on-surface">
                  <ValorAuditavel valor={item} profundidade={profundidade + 1} />
                </dd>
              </>
            )}
          </div>
        );
      })}
    </dl>
  );
}

function ConteudoAuditavel({ titulo, valor }: { titulo: string; valor: unknown }) {
  const conteudoBruto = typeof valor === "string" ? valor : JSON.stringify(valor, null, 2);
  return (
    <section className="flex flex-col gap-2">
      <Revelar rotulo={titulo} tom="forte" meta={resumir(valor)}>
        <div className="flex flex-col gap-2">
          <div className="min-w-0 rounded-lg bg-muted p-3">
            <ValorAuditavel valor={valor} />
          </div>
          {typeof valor === "object" && valor !== null ? (
            <Revelar rotulo="Ver dados brutos (JSON)">
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3">
                {conteudoBruto}
              </pre>
            </Revelar>
          ) : null}
        </div>
      </Revelar>
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
              const explicacoes = coletarExplicacoes(resultado);

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
                      <Revelar rotulo="Detalhes da trilha" tom="forte">
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
                      {explicacoes.length ? (
                        <section className="flex flex-col gap-2">
                          <Revelar
                            rotulo="Explicações ao atleta"
                            tom="forte"
                            meta={`${explicacoes.length} ${explicacoes.length === 1 ? "decisão" : "decisões"}`}
                          >
                            <div className="flex flex-col gap-3">
                              {explicacoes.map(({ pergunta, explicacao }, posicao) => (
                                <ExplicacaoAgent
                                  key={`${pergunta}-${posicao}`}
                                  pergunta={pergunta}
                                  explicacao={explicacao}
                                />
                              ))}
                            </div>
                          </Revelar>
                        </section>
                      ) : null}
                      <ConteudoAuditavel titulo="Retorno do agent" valor={resultado ?? trilha.erro ?? "Nenhum retorno registrado"} />
                      </div>
                      </Revelar>
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
