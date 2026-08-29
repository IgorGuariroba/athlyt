import Link from "next/link";
import { Camera, UtensilsCrossed } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  AcoesRegistro,
  LinhaDoTempoDia,
  NavegacaoDia,
  PainelMacrosDia,
} from "@/components/diario";
import { EstadoVazio, TelaConteudo } from "@/components/tela";
import { FUSO_PADRAO, diaVizinho } from "@/domain/diario/dia-alimentar";
import { hojeDoUsuario, montarDiarioDoDia } from "@/domain/diario/repositorio";
import { confirmarRefeicaoAction, desfazerConfirmacaoAction } from "./actions";
import { rotuloDoDia } from "./rotulo-do-dia";

/**
 * Aba Diário (telas 045–048): linha do tempo unificada do dia com
 * Entradas Planejadas, Consumo Confirmado e sessões de treino, sob o
 * painel de macros consumido vs restante.
 *
 * O dia navegável vem da URL para que a tela seja endereçável e o
 * fuso permaneça explícito em toda ação de escrita.
 *
 * A ação principal da tela é **fotografar**, e não "registrar
 * alimento". Editar uma refeição planejada ou montar um Prato item a
 * item são os caminhos de quem quer precisão; o caminho frequente é
 * apontar a câmera para o prato e deixar o agent estimar. Enquanto o
 * botão único dizia "Registrar alimento", esse caminho ficava a dois
 * toques de distância e escondido atrás de um painel de abas — o
 * atalho mais usado era o mais custoso.
 *
 * A tela é só composição: cada peça visual vive em
 * `@/components/diario`, com story e teste de contrato.
 */
export default async function DiarioPage({
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
  const diario = userId
    ? await montarDiarioDoDia(userId, { dia, fuso })
    : null;

  return (
    <TelaConteudo>
      <section aria-label="Diário" className="flex flex-col gap-4 px-6">
        <NavegacaoDia
          titulo={rotuloDoDia(dia, hoje, fuso)}
          subtitulo={dia}
          hrefAnterior={`/diario?dia=${diaVizinho(dia, -1, fuso)}`}
          hrefProximo={
            dia >= hoje ? undefined : `/diario?dia=${diaVizinho(dia, 1, fuso)}`
          }
        />

        {diario ? <PainelMacrosDia painel={diario.painel} /> : null}

        {/* Registro em um toque, acima da linha do tempo: quem abre o
            Diário com o prato na frente não precisa rolar até o fim para
            começar. */}
        <AcoesRegistro
          hrefFoto={`/diario/registrar/foto?dia=${dia}`}
          hrefBusca={`/diario/registrar?dia=${dia}`}
          hrefDescricao={`/diario/registrar/descricao?dia=${dia}`}
        />

        {diario && diario.linhaDoTempo.length > 0 ? (
          <LinhaDoTempoDia
            itens={diario.linhaDoTempo}
            dia={dia}
            fuso={fuso}
            confirmar={confirmarRefeicaoAction}
            desfazer={desfazerConfirmacaoAction}
          />
        ) : (
          <EstadoVazio
            Icone={UtensilsCrossed}
            titulo={diario ? "O dia começa vazio" : "Diário indisponível"}
            descricao={
              diario
                ? "Fotografe o que você comeu — o agent identifica os alimentos e estima energia e macros."
                : "Entre na sua conta para ver e registrar seu Diário."
            }
            acao={
              diario ? (
                <Button asChild>
                  <Link href={`/diario/registrar/foto?dia=${dia}`}>
                    <Camera className="size-4" aria-hidden="true" /> Fotografar refeição
                  </Link>
                </Button>
              ) : undefined
            }
          />
        )}
      </section>
    </TelaConteudo>
  );
}
