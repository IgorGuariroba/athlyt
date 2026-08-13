import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CabecalhoTela,
  CampoSelecao,
  CartaoLista,
  EstadoVazio,
  LinhaCartaoLista,
  LinhasCartaoLista,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { gerarRevisaoSemanal } from "./actions";
import { obterRevisaoAtual } from "./dados";

const RECUPERACAO = [
  { valor: "1", rotulo: "Muito baixa" },
  { valor: "2", rotulo: "Baixa" },
  { valor: "3", rotulo: "Regular" },
  { valor: "4", rotulo: "Boa" },
  { valor: "5", rotulo: "Muito boa" },
] as const;

const UTILIDADE = [
  { valor: "1", rotulo: "Nada úteis" },
  { valor: "2", rotulo: "Pouco úteis" },
  { valor: "3", rotulo: "Parcialmente úteis" },
  { valor: "4", rotulo: "Úteis" },
  { valor: "5", rotulo: "Muito úteis" },
] as const;

export default async function RevisaoSemanalPage() {
  const revisao = await obterRevisaoAtual();

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Revisão semanal"
        titulo="Planejado versus realizado"
        descricao="Medição isolada ou troca de método não conta como resposta corporal."
        voltar={{ href: "/progresso", rotulo: "Voltar ao Progresso" }}
      />

      <SecoesTela>
        {revisao ? (
          <CartaoLista>
            <LinhasCartaoLista>
              <LinhaCartaoLista
                titulo="Período consolidado"
                valor={`${revisao.periodoInicio.toLocaleDateString("pt-BR")}–${revisao.periodoFim.toLocaleDateString("pt-BR")}`}
              >
                <div className="flex flex-col gap-1">
                  {revisao.evidencias.slice(0, 3).map((item) => (
                    <p key={item.descricao} className="text-body-sm text-on-surface">
                      <span
                        className={
                          item.sentido === "favor"
                            ? "text-success"
                            : "text-warning"
                        }
                      >
                        {item.sentido === "favor" ? "A favor" : "Contra"}:
                      </span>{" "}
                      {item.descricao}
                    </p>
                  ))}
                </div>
                <Button asChild variant="outline" size="sm" className="w-fit">
                  <Link href="/progresso/revisao/scorecard">Ver scorecard</Link>
                </Button>
              </LinhaCartaoLista>
            </LinhasCartaoLista>
          </CartaoLista>
        ) : (
          <EstadoVazio
            Icone={ClipboardList}
            titulo="Nenhuma revisão ainda"
            descricao="A primeira revisão consolida os últimos sete dias sem inventar dados ausentes."
          />
        )}

        <form action={gerarRevisaoSemanal} className="flex flex-col gap-4">
          <CampoSelecao
            id="revisao-recuperacao"
            name="recuperacao"
            rotulo="Como foi sua recuperação?"
            defaultValue="3"
            opcoes={RECUPERACAO}
          />
          <CampoSelecao
            id="revisao-utilidade"
            name="utilidade"
            rotulo="As recomendações foram úteis?"
            defaultValue="3"
            opcoes={UTILIDADE}
          />
          <Button size="cta">
            {revisao ? "Atualizar revisão" : "Iniciar revisão"}
          </Button>
        </form>
      </SecoesTela>
    </TelaConteudo>
  );
}
