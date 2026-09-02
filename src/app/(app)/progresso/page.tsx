import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { GraficoPeso } from "@/components/progresso/grafico-peso";
import { PainelPeso } from "@/components/progresso/painel-peso";
import { CabecalhoTela, TelaConteudo } from "@/components/tela";
import { obterPesoEMetaAtuais, obterSerieDePeso } from "@/domain/medicoes/repositorio";
import { salvarPesoEMeta } from "./actions";

export default async function ProgressoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const [pesos, serie] = await Promise.all([
    obterPesoEMetaAtuais(session.user.id),
    obterSerieDePeso(session.user.id),
  ]);

  return (
    <TelaConteudo>
      <CabecalhoTela titulo="Progresso" className="pb-4" />
      <div className="flex flex-col gap-4 px-6">
        <PainelPeso {...pesos} aoSalvar={salvarPesoEMeta} />
        <GraficoPeso medicoes={serie.medicoes} pesoMetaKg={serie.pesoMetaKg} />
      </div>
    </TelaConteudo>
  );
}
