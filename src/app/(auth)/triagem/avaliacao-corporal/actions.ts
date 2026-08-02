"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { consolidarCircunferencia, type LadoCorporal, type RegiaoCorporal } from "@/domain/medicoes";
import { obterOuCriarAvaliacaoInicial, recalcularMetasProporcao, registrarCircunferencia, registrarGorduraCorporal } from "@/domain/medicoes/repositorio";

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

function preparar(fd: FormData, itens: Array<{ regiao: RegiaoCorporal; lado?: LadoCorporal; prefixo: string }>) {
  return itens.flatMap((item) => {
    const leituras = [numero(fd, `${item.prefixo}1`), numero(fd, `${item.prefixo}2`)];
    const terceira = numero(fd, `${item.prefixo}3`);
    if (Number.isFinite(terceira)) leituras.push(terceira);
    if (leituras.every(Number.isNaN)) return [];
    const resultado = consolidarCircunferencia(leituras);
    if (!resultado.ok) throw new Error(`${item.regiao}: ${resultado.erro}`);
    return [{ ...item, leituras }];
  });
}

async function persistir(userId: string, itens: ReturnType<typeof preparar>) {
  const avaliacao = await obterOuCriarAvaliacaoInicial(userId);
  for (const item of itens) {
    await registrarCircunferencia(userId, { assessmentId: avaliacao.id, regiao: item.regiao, lado: item.lado, leiturasCm: item.leituras });
  }
  await recalcularMetasProporcao(userId);
  revalidatePath("/inicio");
  revalidatePath("/progresso");
}

export async function salvarMedidasEssenciais(fd: FormData) {
  const userId = await usuario();
  try {
    const itens = preparar(fd, [
      { regiao: "cintura", prefixo: "cintura" },
      { regiao: "pescoco", prefixo: "pescoco" },
      { regiao: "quadril", prefixo: "quadril" },
    ]);
    if (itens.length !== 3) throw new Error("Preencha as três regiões com duas leituras.");
    await persistir(userId, itens);
  } catch (erro) {
    redirect(`/triagem/avaliacao-corporal/essenciais?erro=${encodeURIComponent(erro instanceof Error ? erro.message : "Confira as leituras.")}`);
  }
  redirect("/triagem/avaliacao-corporal/completas");
}

export async function salvarMedidasCompletas(fd: FormData) {
  const userId = await usuario();
  try {
    const itens = preparar(fd, [
      { regiao: "torax", prefixo: "torax" }, { regiao: "ombros", prefixo: "ombros" },
      { regiao: "braco", lado: "direito", prefixo: "bracoD" }, { regiao: "braco", lado: "esquerdo", prefixo: "bracoE" },
      { regiao: "coxa", lado: "direito", prefixo: "coxaD" }, { regiao: "coxa", lado: "esquerdo", prefixo: "coxaE" },
      { regiao: "panturrilha", lado: "direito", prefixo: "panturrilhaD" }, { regiao: "panturrilha", lado: "esquerdo", prefixo: "panturrilhaE" },
      { regiao: "punho", prefixo: "punho" }, { regiao: "tornozelo", prefixo: "tornozelo" },
    ]);
    await persistir(userId, itens);
  } catch (erro) {
    redirect(`/triagem/avaliacao-corporal/completas?erro=${encodeURIComponent(erro instanceof Error ? erro.message : "Confira as leituras.")}`);
  }
  redirect("/triagem/avaliacao-corporal/gordura");
}

export async function salvarGordura(fd: FormData) {
  const percentual = numero(fd, "percentual");
  if (Number.isFinite(percentual)) {
    const userId = await usuario();
    const avaliacao = await obterOuCriarAvaliacaoInicial(userId);
    await registrarGorduraCorporal(userId, {
      assessmentId: avaliacao.id,
      percentual,
      metodo: String(fd.get("metodo") ?? "outro"),
      protocolo: String(fd.get("protocolo") ?? "") || undefined,
      equipamento: String(fd.get("equipamento") ?? "") || undefined,
      profissional: String(fd.get("profissional") ?? "") || undefined,
    });
  }
  redirect("/triagem/avaliacao-corporal/fotos");
}
