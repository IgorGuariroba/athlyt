"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { invalidarLeituras } from "@/app/_invalidacao";
import { consolidarCircunferencia } from "@/domain/medicoes";
import { metodoGorduraValido } from "@/domain/medicoes/catalogo-gordura";
import { avaliarLoteCircunferencias, mensagemDoLote } from "@/domain/medicoes/lote-circunferencias";
import { COMPLETAS, ESSENCIAIS, medidaPorPrefixo, type ItemMedida } from "@/domain/medicoes/catalogo-regioes";
import { obterOuCriarAvaliacaoInicial, recalcularMetasProporcao, registrarGorduraCorporal, salvarCircunferenciaDaAvaliacaoInicial } from "@/domain/medicoes/repositorio";

async function usuario() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  return session.user.id;
}

function numero(fd: FormData, nome: string) {
  const bruto = String(fd.get(nome) ?? "").trim();
  if (!bruto) return NaN;
  const valor = Number(bruto.replace(",", "."));
  return Number.isFinite(valor) ? valor : NaN;
}

/**
 * Grava uma única região, para que a medida sobreviva a sair da tela
 * sem passar pelo botão de salvar. É a contrapartida da regra "toda
 * operação que o usuário percebe como salvei grava sozinha"
 * (docs/memory/persistencia-visivel-apos-retorno.md): aqui ele percebe
 * como salvo assim que digita e sai do campo.
 *
 * Não redireciona e não lança em valor inválido — o autosave é
 * silencioso; a validação visível continua no submit.
 */
export async function salvarMedidaDaRegiao(
  prefixo: string,
  valorCm: number,
): Promise<{ ok: boolean }> {
  const item = medidaPorPrefixo(prefixo);
  if (!item) return { ok: false };
  if (!consolidarCircunferencia([valorCm]).ok) return { ok: false };

  const userId = await usuario();
  const avaliacao = await obterOuCriarAvaliacaoInicial(userId);
  await salvarCircunferenciaDaAvaliacaoInicial(userId, {
    assessmentId: avaliacao.id,
    regiao: item.regiao,
    lado: item.lado,
    leiturasCm: [valorCm],
  });
  await recalcularMetasProporcao(userId);
  invalidarLeituras([{ fato: "medicoes" }]);
  return { ok: true };
}

/**
 * Lê o formulário e delega a decisão ao domínio. Um campo por região,
 * nomeado com o próprio prefixo (`fita-v2`).
 */
function preparar(fd: FormData, itens: readonly ItemMedida[]) {
  const porPrefixo = new Map(itens.map((item) => [item.prefixo, item]));
  const entradas = itens.map((item) => {
    const medida = numero(fd, item.prefixo);
    return {
      prefixo: item.prefixo,
      leituras: Number.isNaN(medida) ? [] : [medida],
    };
  });

  const { validos, falhas } = avaliarLoteCircunferencias(entradas);
  return {
    validos: validos.flatMap((entrada) => {
      const base = porPrefixo.get(entrada.prefixo);
      if (!base) return [];
      return [{
        ...base,
        leituras: entrada.leituras,
      }];
    }),
    falhas,
  };
}

async function persistir(userId: string, itens: readonly (ItemMedida & { leituras: number[] })[]) {
  const avaliacao = await obterOuCriarAvaliacaoInicial(userId);
  for (const item of itens) {
    await salvarCircunferenciaDaAvaliacaoInicial(userId, { assessmentId: avaliacao.id, regiao: item.regiao, lado: item.lado, leiturasCm: item.leituras });
  }
  await recalcularMetasProporcao(userId);
}

/**
 * Um valor recusado não deve custar ao usuário todas as outras medidas
 * que ele já digitou: devolvemos os valores preenchidos junto do erro
 * para que a tela os reponha
 * (docs/memory/persistencia-visivel-apos-retorno.md). `falhas` marca as
 * regiões a destacar.
 */
function destinoComErro(
  rota: string,
  fd: FormData,
  prefixos: readonly string[],
  mensagem: string,
  comFalha: readonly string[] = [],
) {
  const params = new URLSearchParams({ erro: mensagem });
  if (comFalha.length > 0) params.set("falhas", comFalha.join(","));
  for (const prefixo of prefixos) {
    const valor = String(fd.get(prefixo) ?? "").trim();
    if (valor) params.set(prefixo, valor);
  }
  return `${rota}?${params}`;
}

export async function salvarMedidasEssenciais(fd: FormData) {
  const userId = await usuario();
  const rota = "/triagem/avaliacao-corporal/essenciais";
  const prefixos = ESSENCIAIS.map((item) => item.prefixo);
  const { validos, falhas } = preparar(fd, ESSENCIAIS);

  if (falhas.length > 0) {
    redirect(
      destinoComErro(rota, fd, prefixos, mensagemDoLote(falhas), falhas.map((f) => f.prefixo)),
    );
  }

  if (validos.length !== ESSENCIAIS.length) {
    const faltantes = ESSENCIAIS.filter(
      (item) => !validos.some((valido) => valido.prefixo === item.prefixo),
    ).map((item) => item.prefixo);
    redirect(
      destinoComErro(rota, fd, prefixos, "Preencha as três regiões.", faltantes),
    );
  }

  await persistir(userId, validos);
  const destino = "/triagem/avaliacao-corporal/completas";
  invalidarLeituras([{ fato: "medicoes" }], { destino });
  redirect(destino);
}

export async function salvarMedidasCompletas(fd: FormData) {
  const userId = await usuario();
  const rota = "/triagem/avaliacao-corporal/completas";
  const { validos, falhas } = preparar(fd, COMPLETAS);

  if (falhas.length > 0) {
    redirect(
      destinoComErro(
        rota,
        fd,
        COMPLETAS.map((item) => item.prefixo),
        mensagemDoLote(falhas),
        falhas.map((f) => f.prefixo),
      ),
    );
  }

  await persistir(userId, validos);
  const destino = "/triagem/avaliacao-corporal/gordura";
  invalidarLeituras([{ fato: "medicoes" }], { destino });
  redirect(destino);
}

export async function salvarGordura(fd: FormData) {
  const rota = "/triagem/avaliacao-corporal/gordura";
  const campos = [
    "percentual",
    "metodo",
    "protocolo",
    "equipamento",
    "profissional",
  ] as const;
  const percentual = numero(fd, "percentual");
  const metodo = String(fd.get("metodo") ?? "");

  if (!Number.isFinite(percentual) || percentual < 2 || percentual > 70) {
    redirect(
      destinoComErro(
        rota,
        fd,
        campos,
        "Informe um percentual entre 2% e 70%.",
      ),
    );
  }
  if (!metodoGorduraValido(metodo)) {
    redirect(
      destinoComErro(rota, fd, campos, "Selecione como o valor foi medido."),
    );
  }

  const userId = await usuario();
  const avaliacao = await obterOuCriarAvaliacaoInicial(userId);
  await registrarGorduraCorporal(userId, {
    assessmentId: avaliacao.id,
    percentual,
    metodo,
    protocolo: String(fd.get("protocolo") ?? "") || undefined,
    equipamento: String(fd.get("equipamento") ?? "") || undefined,
    profissional: String(fd.get("profissional") ?? "") || undefined,
  });
  const destino = "/triagem/avaliacao-corporal/fotos";
  invalidarLeituras([{ fato: "medicoes" }], { destino });
  redirect(destino);
}
