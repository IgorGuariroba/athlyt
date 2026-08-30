import { auth } from "@/auth";
import {
  LinhaDoTempoDia,
  NavegacaoDia,
  PainelMacrosDia,
} from "@/components/diario";
import { EstadoVazio, ExplicacaoAgent, TelaConteudo } from "@/components/tela";
import { obterPlanoAtivo } from "@/domain/plano/repositorio";
import { FUSO_PADRAO, diaVizinho } from "@/domain/diario/dia-alimentar";
import { hojeDoUsuario, montarDiarioDoDia } from "@/domain/diario/repositorio";
import {
  confirmarRefeicaoAction,
  desfazerConfirmacaoAction,
  excluirConsumoAction,
} from "../diario/actions";
import { rotuloDoDia } from "../diario/rotulo-do-dia";

/**
 * Aba Dieta: a tela do dia alimentar, sem nada de treino.
 *
 * Nasce da separação das abas. Antes, quem queria só ajustar a
 * alimentação abria o Diário e encontrava sessões de treino no meio da
 * linha do tempo, e quem queria o treino abria o Início e encontrava a
 * meta nutricional no rodapé do cartão de plano. Cada intenção pagava
 * o custo da outra.
 *
 * A divisão é de recorte, não de dado: Dieta e Diário leem o mesmo
 * `montarDiarioDoDia`. Dieta filtra as sessões (foco); o Diário, agora
 * em Mais, continua sendo o extrato cronológico completo do dia.
 *
 * A ação principal é **fotografar**: o caminho frequente é apontar a
 * câmera para o prato e deixar o agent estimar. Os fluxos de registro
 * continuam sob `/diario/registrar`, que é onde as server actions e o
 * domínio de alimentos já vivem — mover essas rotas seria renomeação
 * sem ganho.
 */
export default async function DietaPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  const { dia: diaParam } = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;
  const fuso = FUSO_PADRAO;
  const hoje = hojeDoUsuario(fuso);
  const dia = diaParam ?? hoje;
  const [diario, planoAtivo] = userId
    ? await Promise.all([
        montarDiarioDoDia(userId, { dia, fuso }),
        obterPlanoAtivo(userId),
      ])
    : [null, null];
  return (
    <TelaConteudo>
      <section aria-label="Dieta" className="flex flex-col gap-4 px-6">
        <NavegacaoDia
          titulo={rotuloDoDia(dia, hoje, fuso)}
          subtitulo={dia}
          hrefAnterior={`/dieta?dia=${diaVizinho(dia, -1, fuso)}`}
          hrefProximo={
            dia >= hoje ? undefined : `/dieta?dia=${diaVizinho(dia, 1, fuso)}`
          }
        />

        {diario ? <PainelMacrosDia painel={diario.painel} /> : null}

        {/* A meta calórica é o número que mais gera desconfiança: sem o
            motivo ao lado, parece arbitrária. A explicação vinha junto
            do cartão de Plano Ativo, no Início; o lugar dela é aqui,
            colada na meta que o dia está perseguindo. */}
        {planoAtivo?.conteudo.nutricao.explicacoes?.calorias ? (
          <ExplicacaoAgent
            pergunta="Como cheguei nessas calorias?"
            explicacao={planoAtivo.conteudo.nutricao.explicacoes.calorias}
          />
        ) : null}

        {diario ? (
          <LinhaDoTempoDia
            itens={diario.linhaDoTempo}
            dia={dia}
            fuso={fuso}
            confirmar={confirmarRefeicaoAction}
            desfazer={desfazerConfirmacaoAction}
            excluir={excluirConsumoAction}
            apenasAlimentar
          />
        ) : (
          <EstadoVazio titulo="Dieta indisponível" descricao="Entre na sua conta para ver e registrar sua dieta." />
        )}
      </section>
    </TelaConteudo>
  );
}
