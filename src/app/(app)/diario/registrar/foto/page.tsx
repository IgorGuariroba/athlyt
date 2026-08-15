import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CabecalhoTela, NotaTela, SecoesTela, TelaConteudo } from "@/components/tela";
import { FUSO_PADRAO } from "@/domain/diario/dia-alimentar";
import { hojeDoUsuario } from "@/domain/diario/repositorio";
import { registrarPratoAction } from "../../actions";
import { estimarRefeicaoAction } from "./actions";
import { RegistroPorFoto } from "./estimativa";

/**
 * Registro por foto — rota própria e não modal, pelo mesmo motivo dos
 * demais Atalhos: a tela é endereçável, sobrevive a recarregar e
 * mantém o dia escolhido explícito na URL.
 *
 * Ela é o caminho de menor atrito do Diário: quem não quer editar o
 * almoço nem buscar alimento fotografa o prato e confirma. Por isso
 * ela é alcançável direto da linha do tempo, sem passar pelo painel
 * de atalhos.
 */
export default async function RegistrarPorFotoPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { dia: diaParam } = await searchParams;
  const fuso = FUSO_PADRAO;
  const dia = diaParam ?? hojeDoUsuario(fuso);

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Registrar por foto"
        titulo="Fotografe o prato"
        descricao="O agent identifica os alimentos e estima energia e macros. Você confere e registra."
        voltar={{ href: `/diario?dia=${dia}`, rotulo: "Voltar ao Diário" }}
      />

      <SecoesTela>
        <RegistroPorFoto
          dia={dia}
          fuso={fuso}
          estimar={estimarRefeicaoAction}
          registrar={registrarPratoAction}
        />
      </SecoesTela>

      <NotaTela>
        Estimativa por foto é aproximação, não medição: ela entra no Diário
        marcada como tal e pode ser corrigida a qualquer momento.
      </NotaTela>
    </TelaConteudo>
  );
}
