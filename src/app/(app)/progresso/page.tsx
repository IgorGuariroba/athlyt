import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PainelPeso } from "@/components/progresso/painel-peso";
import { CabecalhoTela, TelaConteudo } from "@/components/tela";
import { obterPesoEMetaAtuais } from "@/domain/medicoes/repositorio";
import { salvarPesoEMeta } from "./actions";

export default async function ProgressoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const pesos = await obterPesoEMetaAtuais(session.user.id);

  return (
    <TelaConteudo>
      <CabecalhoTela titulo="Progresso" className="pb-4" />
      <div className="px-6">
        <PainelPeso {...pesos} aoSalvar={salvarPesoEMeta} />
      </div>
    </TelaConteudo>
  );
}
