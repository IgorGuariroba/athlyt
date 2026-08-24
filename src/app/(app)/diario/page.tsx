import Link from "next/link";
import { Camera, Check, Undo2, UtensilsCrossed } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  AcoesRegistro,
  CartaoConsumo,
  CartaoRefeicaoPlanejada,
  CartaoSessaoDiario,
  LinhaDoTempoDiario,
  NavegacaoDia,
  PainelMacrosDia,
} from "@/components/diario";
import { EstadoVazio, TelaConteudo } from "@/components/tela";
import { FUSO_PADRAO, diaVizinho } from "@/domain/diario/dia-alimentar";
import { hojeDoUsuario, montarDiarioDoDia } from "@/domain/diario/repositorio";
import type { ItemLinhaDoTempo } from "@/domain/diario/tipos";
import { confirmarRefeicaoAction, desfazerConfirmacaoAction } from "./actions";

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
function rotuloDoDia(dia: string, hoje: string, fuso: string): string {
  if (dia === hoje) return "Hoje";
  if (dia === diaVizinho(hoje, -1, fuso)) return "Ontem";
  const [ano, mes, diaMes] = dia.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(ano, mes - 1, diaMes)));
}

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
        />

        {diario && diario.linhaDoTempo.length > 0 ? (
          <LinhaDoTempoDiario
            itens={diario.linhaDoTempo.map((item) => ({
              id: chave(item),
              horaLocal: item.horaLocal,
              conteudo: cartao(item, dia, fuso),
            }))}
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

function chave(item: ItemLinhaDoTempo): string {
  if (item.tipo === "planejada") return `planejada-${item.entrada.refeicaoRef}`;
  if (item.tipo === "consumo") return `consumo-${item.consumo.id}`;
  return `sessao-${item.sessaoId}`;
}

function cartao(item: ItemLinhaDoTempo, dia: string, fuso: string) {
  if (item.tipo === "sessao") {
    return (
      <CartaoSessaoDiario
        nome={item.nome}
        estado={item.estado}
        href={
          item.estado === "concluida"
            ? `/sessao/${item.sessaoId}/resumo`
            : `/sessao/${item.sessaoId}`
        }
      />
    );
  }

  if (item.tipo === "consumo") {
    const { consumo } = item;
    // Um consumo estimado por foto não pode se parecer com um medido:
    // a marca fica no próprio cartão para que a revisão do dia saiba
    // qual número merece desconfiança (user story 59).
    const estimado = consumo.itens.some(
      (alimentar) => (alimentar as { origemDado?: string }).origemDado === "estimativa-ia",
    );
    return (
      <CartaoConsumo
        nome={consumo.nome}
        macros={consumo.macros}
        planejado={consumo.planejado}
        estimadoPorFoto={estimado}
        acoes={
          consumo.refeicaoRef ? (
            <form action={desfazerConfirmacaoAction}>
              <input type="hidden" name="dia" value={dia} />
              <input type="hidden" name="fuso" value={fuso} />
              <input type="hidden" name="refeicaoRef" value={consumo.refeicaoRef} />
              <Button type="submit" variant="ghost" size="sm">
                <Undo2 className="size-4" aria-hidden="true" /> Desfazer
              </Button>
            </form>
          ) : undefined
        }
      />
    );
  }

  const { entrada } = item;
  return (
    <CartaoRefeicaoPlanejada
      nome={entrada.nome}
      macros={entrada.macros}
      itens={entrada.itens}
      explicacao={entrada.explicacao}
      hrefFoto={`/diario/registrar/foto?dia=${dia}`}
      hrefAjustar={`/diario/refeicao/${encodeURIComponent(entrada.refeicaoRef)}?dia=${dia}`}
      confirmacao={
        <form action={confirmarRefeicaoAction}>
          <input type="hidden" name="dia" value={dia} />
          <input type="hidden" name="fuso" value={fuso} />
          <input type="hidden" name="refeicaoRef" value={entrada.refeicaoRef} />
          <Button
            type="submit"
            className="w-full"
            aria-label={`Comi como planejado: ${entrada.nome}`}
          >
            <Check className="size-4" aria-hidden="true" /> Comi como planejado
          </Button>
        </form>
      }
    />
  );
}
