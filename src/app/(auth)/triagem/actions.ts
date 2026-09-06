"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { invalidarLeituras } from "@/app/_invalidacao";
import { garantirPesoInicial } from "@/domain/medicoes/repositorio";
import { registrarRespostas } from "@/domain/triagem/perfil";
import {
  parseRespostaEtapa,
  validarEquipamentosPersonalizados,
} from "@/domain/triagem/validacao";
import { isEtapaId, type EtapaId } from "@/domain/triagem/etapas";

/**
 * Submete uma etapa da cascata: valida o FormData, registra a resposta
 * como nova versão do perfil e
 * redireciona para a próxima etapa informada pelo cliente (a ordem
 * fixa vive em `ETAPAS_TRIAGEM`, o form embute o próximo passo em um
 * campo oculto para não duplicar essa regra na server action).
 *
 * Em erro de validação, retorna a mensagem para a página re-renderizar
 * o formulário com o erro — mantendo "uma pergunta por tela" mesmo em
 * caso de engano do usuário.
 */
/**
 * Persiste imediatamente o inventário personalizado. Diferente dos
 * campos comuns da etapa, cadastrar/excluir um equipamento é uma
 * operação completa por si só: usar Voltar não pode desfazê-la só
 * porque o formulário maior ainda não foi enviado.
 */
export async function salvarEquipamentosPersonalizados(entrada: {
  localTreino: string;
  equipamentos: string[];
  cadastrados: string[];
  selecionados: string[];
}): Promise<{ ok: true } | { ok: false; erro: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, erro: "Sessão expirada." };

  const validado = validarEquipamentosPersonalizados(entrada);
  if (!validado.ok) {
    return { ok: false, erro: "Não foi possível salvar os equipamentos." };
  }

  // A operação imediata precisa persistir um snapshot coerente da
  // etapa. Em um perfil novo, salvar apenas o nome livre deixaria o
  // local ainda indefinido; ao voltar, a tela esconderia toda a seção
  // de equipamentos e daria a impressão de que o cadastro sumiu.
  const formData = new FormData();
  formData.set("localTreino", entrada.localTreino);
  for (const id of entrada.equipamentos) formData.append("equipamentos", id);
  for (const nome of validado.selecionados) {
    formData.append("equipamentosPersonalizados", nome);
  }
  for (const nome of validado.cadastrados) {
    formData.append("equipamentosPersonalizadosCadastrados", nome);
  }
  const etapa = parseRespostaEtapa("academia-equipamentos", formData);
  if (!etapa.ok) return { ok: false, erro: etapa.erro };

  await registrarRespostas(userId, etapa.dados);
  invalidarLeituras([{ fato: "perfil" }]);
  return { ok: true };
}

export async function submeterEtapaTriagem(
  etapaAtual: string,
  proximaEtapa: string,
  formData: FormData,
): Promise<{ erro: string } | undefined> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/");
  }

  if (!isEtapaId(etapaAtual)) {
    throw new Error(`Etapa de triagem desconhecida: ${etapaAtual}`);
  }

  const resultado = parseRespostaEtapa(etapaAtual, formData);
  if (!resultado.ok) {
    return { erro: resultado.erro };
  }

  await registrarRespostas(userId, resultado.dados);

  // O peso da triagem é a linha de base do gráfico do Progresso, e por
  // isso precisa existir como medição, não só como resposta do perfil.
  if (
    etapaAtual === "peso" &&
    "pesoKg" in resultado.dados &&
    resultado.dados.pesoKg !== undefined
  ) {
    await garantirPesoInicial(userId, resultado.dados.pesoKg);
  }

  const retorno = formData.get("retorno");
  const proxima: EtapaId | "resumo" = isEtapaId(proximaEtapa)
    ? proximaEtapa
    : "resumo";
  const destino =
    retorno === "/mais/perfil" || retorno === "/triagem/resumo"
      ? retorno
      : etapaAtual === "peso"
        ? "/triagem/avaliacao-corporal"
        : proxima === "resumo"
          ? "/triagem/resumo"
          : `/triagem/${proxima}`;

  // O peso registrado também é medição: a linha de base do gráfico do
  // Progresso muda junto com a resposta do perfil.
  invalidarLeituras(
    etapaAtual === "peso" ? [{ fato: "perfil" }, { fato: "medicoes" }] : [{ fato: "perfil" }],
    { destino },
  );
  redirect(destino);
}
