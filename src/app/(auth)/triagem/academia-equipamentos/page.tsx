import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "@/components/tela/cascata-shell";
import { carregarRespostasTriagem } from "../_lib/carregar-respostas";
import { EtapaForm } from "../_components/etapa-form";
import { SelecaoEquipamentos } from "./_components/selecao-equipamentos";

/**
 * Esta etapa é a que mais restringe o plano: um equipamento não
 * declarado aqui é um exercício que a IA não pode prescrever. A seleção em si
 * vive num componente cliente porque o local de treino pré-marca os
 * equipamentos plausíveis.
 */
export default async function AcademiaEquipamentosPage() {
  const respostas = await carregarRespostasTriagem();
  const { indice, total } = posicaoNaCascata("academia-equipamentos");

  return (
    <CascataShell titulo="Onde você treina?" indice={indice} total={total}>
      <EtapaForm
        etapaAtual="academia-equipamentos"
        proximaEtapa={proximoDestinoCascata("academia-equipamentos")}
      >
        <SelecaoEquipamentos
          localInicial={respostas.localTreino}
          equipamentosIniciais={respostas.equipamentos}
          equipamentosPersonalizadosIniciais={
            respostas.equipamentosPersonalizados
          }
          equipamentosPersonalizadosCadastradosIniciais={
            respostas.equipamentosPersonalizadosCadastrados
          }
        />
      </EtapaForm>
    </CascataShell>
  );
}
