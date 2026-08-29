import { Check, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ItemLinhaDoTempo } from "@/domain/diario/tipos";
import {
  CartaoConsumo,
  CartaoRefeicaoPlanejada,
  CartaoSessaoDiario,
} from "./cartoes-diario";
import { LinhaDoTempoDiario } from "./linha-do-tempo";

/**
 * Linha do tempo de um dia, montada a partir dos itens do domínio.
 *
 * Nasceu como função privada dentro de `src/app/(app)/diario/page.tsx`.
 * Quando a aba Dieta passou a mostrar o mesmo dia sem as sessões de
 * treino, manter a montagem na rota significaria duplicar os três
 * cartões e as duas server actions em duas páginas — e divergir na
 * primeira mudança de qualquer um deles.
 *
 * As server actions entram por prop porque pertencem à rota; o
 * componente conhece a forma do dia, não o caminho da escrita.
 *
 * `apenasAlimentar` existe para a aba Dieta: o mesmo dia, sem os
 * cartões de sessão. O filtro fica aqui, e não na consulta, para que
 * Diário e Dieta continuem lendo um único agregado do domínio.
 */
export function LinhaDoTempoDia({
  itens,
  dia,
  fuso,
  confirmar,
  desfazer,
  apenasAlimentar = false,
}: {
  itens: readonly ItemLinhaDoTempo[];
  dia: string;
  fuso: string;
  confirmar: (formData: FormData) => void | Promise<void>;
  desfazer: (formData: FormData) => void | Promise<void>;
  apenasAlimentar?: boolean;
}) {
  const visiveis = apenasAlimentar
    ? itens.filter((item) => item.tipo !== "sessao")
    : itens;

  return (
    <LinhaDoTempoDiario
      itens={visiveis.map((item) => ({
        id: chave(item),
        horaLocal: item.horaLocal,
        conteudo: cartao(item, dia, fuso, confirmar, desfazer),
      }))}
    />
  );
}

/** Quantos itens a linha do tempo mostraria com o mesmo filtro. */
export function contarItensDoDia(
  itens: readonly ItemLinhaDoTempo[],
  apenasAlimentar = false,
): number {
  return apenasAlimentar
    ? itens.filter((item) => item.tipo !== "sessao").length
    : itens.length;
}

function chave(item: ItemLinhaDoTempo): string {
  if (item.tipo === "planejada") return `planejada-${item.entrada.refeicaoRef}`;
  if (item.tipo === "consumo") return `consumo-${item.consumo.id}`;
  return `sessao-${item.sessaoId}`;
}

function cartao(
  item: ItemLinhaDoTempo,
  dia: string,
  fuso: string,
  confirmar: (formData: FormData) => void | Promise<void>,
  desfazer: (formData: FormData) => void | Promise<void>,
) {
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
            <form action={desfazer}>
              <CamposContexto dia={dia} fuso={fuso} refeicaoRef={consumo.refeicaoRef} />
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
        <form action={confirmar}>
          <CamposContexto dia={dia} fuso={fuso} refeicaoRef={entrada.refeicaoRef} />
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

function CamposContexto({
  dia,
  fuso,
  refeicaoRef,
}: {
  dia: string;
  fuso: string;
  refeicaoRef: string;
}) {
  return (
    <>
      <input type="hidden" name="dia" value={dia} />
      <input type="hidden" name="fuso" value={fuso} />
      <input type="hidden" name="refeicaoRef" value={refeicaoRef} />
    </>
  );
}
