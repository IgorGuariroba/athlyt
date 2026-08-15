import Link from "next/link";
import { Camera, Check, ChevronLeft, ChevronRight, Dumbbell, Pencil, Plus, Sparkles, Undo2, UtensilsCrossed } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { EstadoVazio, ExplicacaoAgent } from "@/components/tela";
import { FUSO_PADRAO, diaVizinho } from "@/domain/diario/dia-alimentar";
import { hojeDoUsuario, montarDiarioDoDia } from "@/domain/diario/repositorio";
import type { ItemLinhaDoTempo } from "@/domain/diario/tipos";
import { confirmarRefeicaoAction, desfazerConfirmacaoAction } from "./actions";
import { PainelDeMacros } from "./painel-macros";

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
    <section aria-label="Diário" className="flex flex-col gap-4 p-4 pb-8">
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/diario?dia=${diaVizinho(dia, -1, fuso)}`} aria-label="Dia anterior">
            <ChevronLeft />
          </Link>
        </Button>
        <div className="text-center">
          <h1 className="text-title-lg font-bold text-on-surface-strong">
            {rotuloDoDia(dia, hoje, fuso)}
          </h1>
          <p className="text-caption text-muted-foreground">{dia}</p>
        </div>
        <Button asChild variant="ghost" size="icon" disabled={dia >= hoje}>
          <Link href={`/diario?dia=${diaVizinho(dia, 1, fuso)}`} aria-label="Próximo dia">
            <ChevronRight />
          </Link>
        </Button>
      </header>

      {diario ? <PainelDeMacros painel={diario.painel} /> : null}

      {/* Registro em um toque, acima da linha do tempo: quem abre o
          Diário com o prato na frente não precisa rolar até o fim para
          começar. Duas opções apenas — a câmera como caminho padrão e
          a busca como caminho preciso. */}
      <div className="flex gap-2">
        <Button asChild size="lg" className="h-14 flex-1 flex-col gap-0.5">
          <Link href={`/diario/registrar/foto?dia=${dia}`}>
            <span className="flex items-center gap-2 text-label-lg">
              <Camera className="size-5" aria-hidden="true" /> Fotografar refeição
            </span>
            <span className="text-caption font-normal opacity-80">
              o agent estima calorias e macros
            </span>
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-14 w-14 shrink-0">
          <Link href={`/diario/registrar?dia=${dia}`} aria-label="Registrar buscando alimento">
            <Plus className="size-5" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {diario && diario.linhaDoTempo.length > 0 ? (
        <ol aria-label="Linha do tempo do dia" className="flex flex-col">
          {diario.linhaDoTempo.map((item) => (
            <li key={chave(item)} className="flex gap-3">
              <div className="flex w-12 shrink-0 flex-col items-center pt-4">
                <span className="text-caption tabular-nums text-muted-foreground">
                  {item.horaLocal}
                </span>
                <span className="mt-1 w-px flex-1 bg-border" />
              </div>
              <div className="min-w-0 flex-1 py-2">{cartao(item, dia, fuso)}</div>
            </li>
          ))}
        </ol>
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
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-container p-4">
        <Dumbbell className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-title font-bold text-on-surface-strong">{item.nome}</p>
          <p className="text-body-sm text-muted-foreground">
            {item.estado === "concluida"
              ? "Sessão de Treino concluída"
              : item.estado === "em_andamento"
                ? "Sessão de Treino em andamento"
                : "Sessão de Treino encerrada antes do fim"}
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={item.estado === "concluida" ? `/sessao/${item.sessaoId}/resumo` : `/sessao/${item.sessaoId}`}>
            Ver
          </Link>
        </Button>
      </div>
    );
  }

  if (item.tipo === "consumo") {
    const { consumo } = item;
    const delta = consumo.planejado ? consumo.macros.calorias - consumo.planejado.calorias : 0;
    // Um consumo estimado por foto não pode se parecer com um medido:
    // a marca fica no próprio cartão para que a revisão do dia saiba
    // qual número merece desconfiança (user story 59).
    const estimado = consumo.itens.some(
      (alimentar) => (alimentar as { origemDado?: string }).origemDado === "estimativa-ia",
    );
    return (
      <div className="rounded-xl border border-success/40 bg-surface-container p-4">
        <div className="flex items-start gap-3">
          <Check className="mt-1 size-5 shrink-0 text-success" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-title font-bold text-on-surface-strong">{consumo.nome}</p>
            {estimado ? (
              <p className="flex items-center gap-1 text-caption text-muted-foreground">
                <Sparkles className="size-3" aria-hidden="true" /> Estimado por foto
              </p>
            ) : null}
            <p className="text-body-sm tabular-nums text-muted-foreground">
              {consumo.macros.calorias} kcal · {consumo.macros.proteinaG}P ·{" "}
              {consumo.macros.carboidratosG}C · {consumo.macros.gordurasG}G
            </p>
            {consumo.planejado && delta !== 0 ? (
              // Desvio é informação, não repreensão (tela 048).
              <p className="mt-1 text-caption text-muted-foreground">
                {delta > 0 ? `${delta} kcal a mais que` : `${Math.abs(delta)} kcal a menos que`} o
                planejado ({consumo.planejado.calorias} kcal)
              </p>
            ) : null}
          </div>
        </div>
        {consumo.refeicaoRef ? (
          <form action={desfazerConfirmacaoAction} className="mt-3 flex justify-end">
            <input type="hidden" name="dia" value={dia} />
            <input type="hidden" name="fuso" value={fuso} />
            <input type="hidden" name="refeicaoRef" value={consumo.refeicaoRef} />
            <Button type="submit" variant="ghost" size="sm">
              <Undo2 className="size-4" aria-hidden="true" /> Desfazer
            </Button>
          </form>
        ) : null}
      </div>
    );
  }

  const { entrada } = item;
  return (
    // Esmaecida enquanto planejada: prescrição não é consumo.
    <div className="rounded-xl border border-dashed border-border bg-surface-container/50 p-4">
      <div className="flex items-start gap-3">
        <UtensilsCrossed className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-title font-bold text-on-surface">{entrada.nome}</p>
          <p className="text-caption tracking-wide text-muted-foreground uppercase">Planejada</p>
          <p className="mt-1 text-body-sm tabular-nums text-muted-foreground">
            {entrada.macros.calorias} kcal · {entrada.macros.proteinaG}P ·{" "}
            {entrada.macros.carboidratosG}C · {entrada.macros.gordurasG}G
          </p>
          <ul className="mt-2 flex flex-col gap-0.5 text-body-sm text-muted-foreground">
            {entrada.itens.map((alimento) => (
              <li key={alimento.descricao}>{alimento.descricao}</li>
            ))}
          </ul>
          {/* Enquanto planejada: é aqui, diante do prato, que a pergunta
              nasce. Confirmada, a refeição vira consumo real e o motivo
              da prescrição perde a função. */}
          <div className="mt-2">
            <ExplicacaoAgent
              pergunta="Por que esta refeição?"
              explicacao={entrada.explicacao}
            />
          </div>
        </div>
      </div>
      {/* Três saídas diante do prato, na ordem do esforço que exigem:
          comi como planejado (um toque), comi outra coisa (foto) e
          ajustar porções (edição item a item). Antes só as duas pontas
          existiam, e quem comeu algo diferente do plano — o caso mais
          comum — caía na edição manual por falta de alternativa.

          Empilhadas, e não numa linha: três rótulos lado a lado não
          cabem na largura de um celular — o primeiro botão vazava para
          fora do cartão. A confirmação ocupa a linha inteira porque é a
          ação esperada; as duas divergentes dividem a linha de baixo. */}
      <div className="mt-3 flex flex-col gap-2">
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
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm" className="flex-1">
            <Link
              href={`/diario/registrar/foto?dia=${dia}`}
              aria-label={`Comi outra coisa no lugar de ${entrada.nome}`}
            >
              <Camera className="size-4" aria-hidden="true" /> Comi outra coisa
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="flex-1">
            <Link
              href={`/diario/refeicao/${encodeURIComponent(entrada.refeicaoRef)}?dia=${dia}`}
              aria-label={`Editar ${entrada.nome}`}
            >
              <Pencil className="size-4" aria-hidden="true" /> Ajustar porções
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
