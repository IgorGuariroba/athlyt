import { redirect } from "next/navigation";

import { obterSessaoAtual } from "@/auth/sessao";
import { PainelGraficoPeso } from "@/components/progresso/painel-grafico-peso";
import { PainelPeso } from "@/components/progresso/painel-peso";
import { CabecalhoTela, TelaConteudo } from "@/components/tela";
import { obterPesoEMetaAtuais, obterSerieDePeso } from "@/domain/medicoes/repositorio";
import { salvarPesoEMeta } from "./actions";

export default async function ProgressoPage() {
  const session = await obterSessaoAtual();
  if (!session?.user?.id) redirect("/");
  const [pesos, serie] = await Promise.all([
    obterPesoEMetaAtuais(session.user.id),
    obterSerieDePeso(session.user.id),
  ]);

  return (
    <TelaConteudo>
      <CabecalhoTela titulo="Progresso" className="pb-4" />
      <div className="flex flex-col gap-4 px-6">
        {/* A leitura vem antes do registro: ao abrir a tela, a
            pergunta é "como estou indo", não "quanto pesei hoje". */}
        <PainelGraficoPeso medicoes={serie.medicoes} pesoMetaKg={serie.pesoMetaKg} />
        <PainelPeso {...pesos} aoSalvar={salvarPesoEMeta} />
      </div>
    </TelaConteudo>
  );
}
