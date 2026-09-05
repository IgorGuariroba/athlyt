import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AcaoTela,
  CabecalhoSecao,
  CabecalhoTela,
  CartaoLista,
  LinhaCartaoLista,
  LinhasCartaoLista,
  MedidorScore,
  NotaTela,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import type { DimensoesScorecard } from "@/domain/medicoes/revisao-corporal";
import type { EstadoConfianca } from "@/domain/medicoes";
import { obterRevisaoAtual } from "../dados";

const ROTULOS: Array<[keyof DimensoesScorecard, string]> = [
  ["aderencia", "Aderência"],
  ["desempenho", "Desempenho"],
  ["tendenciaCorporal", "Tendência corporal"],
  ["recuperacao", "Recuperação"],
  ["utilidade", "Utilidade"],
];

/** Rótulo legível para as chaves camelCase de `confiancas`. */
const legivel = (nome: string) =>
  nome.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

export default async function ScorecardPage() {
  const revisao = await obterRevisaoAtual();
  if (!revisao) redirect("/progresso/revisao");

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Revisão semanal · 2/4"
        titulo="Scorecard de progresso"
        descricao="As dimensões permanecem separadas; o geral não apaga incertezas."
        voltar={{ href: "/progresso/revisao", rotulo: "Voltar à revisão" }}
      />

      <SecoesTela>
        <CartaoLista>
          <LinhasCartaoLista>
            <LinhaCartaoLista titulo="Dimensões" valor={`${revisao.scorecard.geral}/100`}>
              <div className="flex flex-col gap-4 pt-1">
                {ROTULOS.map(([id, rotulo]) => (
                  <MedidorScore
                    key={id}
                    rotulo={rotulo}
                    valor={revisao.scorecard[id]}
                  />
                ))}
              </div>
            </LinhaCartaoLista>
          </LinhasCartaoLista>
        </CartaoLista>

        <section className="flex flex-col gap-3">
          <CabecalhoSecao
            titulo="Confiança por dimensão"
            descricao="Quanto de evidência sustenta cada leitura."
          />
          <CartaoLista>
            <LinhasCartaoLista>
              {/* `Object.entries` sobre interface sem index signature cai no
                  overload `[string, any][]` do lib.es5; o recast recupera o
                  tipo da entrada sem recorrer a `any` na JSX. */}
              {(Object.entries(revisao.confiancas) as [string, EstadoConfianca][]).map(([nome, estado]) => (
                <LinhaCartaoLista
                  key={nome}
                  titulo={legivel(nome)}
                  valor={estado}
                />
              ))}
            </LinhasCartaoLista>
          </CartaoLista>
        </section>
      </SecoesTela>

      <NotaTela>
        Metodologia {revisao.scorecard.metodologiaVersao}.
      </NotaTela>

      <AcaoTela>
        <Button asChild size="cta" className="w-full">
          <Link href="/progresso/revisao/evidencias">Ver evidências</Link>
        </Button>
      </AcaoTela>
    </TelaConteudo>
  );
}
