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
                    <FaixaDados>
                      {trilha.modeloResolvido ?? trilha.modeloSolicitado} ·
                      perfil v{trilha.perfilVersao}
                    </FaixaDados>
                    <p className="text-body-sm text-muted-foreground">
                      Dados usados: {campos}
                    </p>
                    {resultado ? (
                      <p className="text-body-sm text-muted-foreground">
                        Resultado:{" "}
                        {resultado.tipo
                          ? String(resultado.tipo)
                          : "decisão registrada"}
                        {resultado.de
                          ? ` · ${resultado.de} → ${resultado.para}`
                          : ""}
                      </p>
                    ) : null}
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
