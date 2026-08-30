import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegistroPorDescricao } from "@/components/diario";
import { CabecalhoTela, NotaTela, SecoesTela, TelaConteudo } from "@/components/tela";
import { CATEGORIAS_DE_REFEICAO } from "@/domain/diario/cardapio";
import { FUSO_PADRAO, horaLocal } from "@/domain/diario/dia-alimentar";
import {
  hojeDoUsuario,
  obterConsumoDaRefeicao,
  obterEntradaPlanejada,
} from "@/domain/diario/repositorio";
import {
  estimarPorDescricaoAction,
  recalcularMacrosDoItemAction,
  registrarConsumoRealAction,
  transcreverAudioAction,
} from "./actions";

/**
 * Registro Retroativo por texto ou áudio (ADR 0002) — rota própria e
 * não modal, pelo mesmo motivo dos demais Atalhos: endereçável,
 * sobrevive a recarregar e mantém dia e refeição explícitos na URL.
 *
 * `refeicaoRef` chega de "Comi outra coisa" no cartão da Refeição
 * Planejada. Com ele, a tela já sabe o nome, o horário e — o que
 * importa antes de gravar — se aquela refeição já tem Consumo Real:
 * é isso que permite avisar da substituição em vez de sobrescrever
 * calado. Sem ele, a mesma tela registra uma refeição que ninguém
 * planejou.
 */
export default async function RegistrarPorDescricaoPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; refeicao?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;

  const { dia: diaParam, refeicao } = await searchParams;
  const fuso = FUSO_PADRAO;
  const dia = diaParam ?? hojeDoUsuario(fuso);
  const refeicaoRef = refeicao ? decodeURIComponent(refeicao) : null;

  const planejada = refeicaoRef ? await obterEntradaPlanejada(userId, refeicaoRef) : null;
  const existente = refeicaoRef
    ? await obterConsumoDaRefeicao(userId, { refeicaoRef, dia, fuso })
    : null;

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Registrar por descrição"
        titulo={planejada ? `No lugar de ${planejada.nome}` : "Conte o que você comeu"}
        descricao="Escreva ou fale o que comeu. O agent estima energia e macros, e você confere antes de registrar."
        voltar={{ href: `/diario?dia=${dia}`, rotulo: "Voltar ao Diário" }}
      />

      <SecoesTela>
        <RegistroPorDescricao
          dia={dia}
          horaInicial={planejada?.horaLocal ?? horaLocal(new Date(), fuso)}
          nomeInicial={planejada?.nome ?? ""}
          refeicaoRef={refeicaoRef}
          consumoExistente={
            existente ? { nome: existente.nome, macros: existente.macros } : null
          }
          categorias={CATEGORIAS_DE_REFEICAO}
          estimar={estimarPorDescricaoAction}
          transcrever={transcreverAudioAction}
          registrar={registrarConsumoRealAction}
          recalcularItem={recalcularMacrosDoItemAction}
        />
      </SecoesTela>

      <NotaTela>
        Estimativa por descrição é aproximação, não medição: ela entra no Diário
        marcada como tal e pode ser corrigida a qualquer momento. A Refeição
        Planejada continua guardada como referência.
      </NotaTela>
    </TelaConteudo>
  );
}
