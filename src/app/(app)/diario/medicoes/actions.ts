"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { registrarCircunferencia, registrarGorduraCorporal, registrarPeso, recalcularMetasProporcao } from "@/domain/medicoes/repositorio";

const n = (fd: FormData, key: string) => {
  const bruto = String(fd.get(key) ?? "").trim();
  return bruto ? Number(bruto.replace(",", ".")) : NaN;
};
export async function registrarCheckinCorporal(fd: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;
  const peso = n(fd, "peso");
  if (Number.isFinite(peso)) await registrarPeso(userId, peso);
  const cintura = [n(fd, "cintura1"), n(fd, "cintura2")];
  const terceira = n(fd, "cintura3");
  if (Number.isFinite(terceira)) cintura.push(terceira);
  if (cintura.every(Number.isFinite)) {
    const resultado = await registrarCircunferencia(userId, { regiao: "cintura", leiturasCm: cintura });
    if (!resultado.ok) redirect(`/diario/medicoes?erro=${encodeURIComponent(resultado.erro)}`);
    await recalcularMetasProporcao(userId);
  }
  const gordura = n(fd, "gordura");
  if (Number.isFinite(gordura)) await registrarGorduraCorporal(userId, { percentual: gordura, metodo: String(fd.get("metodo") ?? "outro"), protocolo: String(fd.get("protocolo") ?? "") || undefined });
  revalidatePath("/inicio"); revalidatePath("/progresso"); revalidatePath("/diario");
  redirect("/progresso");
}
