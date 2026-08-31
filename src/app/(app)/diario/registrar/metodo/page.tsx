import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SeletorMetodoRegistro } from "@/components/diario/seletor-metodo-registro";
import { CabecalhoTela, SecoesTela, TelaConteudo } from "@/components/tela";
import { FUSO_PADRAO } from "@/domain/diario/dia-alimentar";
import { hojeDoUsuario, obterEntradaPlanejada } from "@/domain/diario/repositorio";

export default async function MetodoRegistroPage({ searchParams }: { searchParams: Promise<{ dia?: string; refeicao?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const { dia: diaParam, refeicao } = await searchParams;
  const dia = diaParam ?? hojeDoUsuario(FUSO_PADRAO);
  const refeicaoRef = refeicao ? decodeURIComponent(refeicao) : null;
  const planejada = refeicaoRef ? await obterEntradaPlanejada(session.user.id, refeicaoRef) : null;

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Registrar refeição"
        titulo={planejada ? `No lugar de ${planejada.nome}` : "Adicionar refeição extra"}
        descricao="Escolha a forma mais conveniente. Você poderá conferir os alimentos e corrigir o horário antes de salvar."
        voltar={{ href: `/diario?dia=${dia}`, rotulo: "Voltar à linha do tempo" }}
      />
      <SecoesTela><SeletorMetodoRegistro dia={dia} refeicaoRef={refeicaoRef} /></SecoesTela>
    </TelaConteudo>
  );
}
