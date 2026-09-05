"use server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { invalidarLeituras } from "@/app/_invalidacao";
import { registrarCircunferencia, registrarGorduraCorporal, registrarPeso, recalcularMetasProporcao } from "@/domain/medicoes/repositorio";
import { campoTexto, campoTextoOpcional } from "@/lib/form-data";

const n = (fd: FormData, key: string) => {
  const bruto = campoTexto(fd, key).trim();
  return bruto ? Number(bruto.replace(",", ".")) : NaN;
};
export async function registrarCheckinCorporal(fd: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;
  const peso = n(fd, "peso");
  if (Number.isFinite(peso)) await registrarPeso(userId, peso);
  // Uma medida por região.
  const cintura = n(fd, "cintura");
  if (Number.isFinite(cintura)) {
    const resultado = await registrarCircunferencia(userId, { regiao: "cintura", leiturasCm: [cintura] });
    if (!resultado.ok) redirect(`/diario/medicoes?erro=${encodeURIComponent(resultado.erro)}`);
    await recalcularMetasProporcao(userId);
  }
  const gordura = n(fd, "gordura");
  if (Number.isFinite(gordura)) await registrarGorduraCorporal(userId, { percentual: gordura, metodo: campoTexto(fd, "metodo", "outro"), protocolo: campoTextoOpcional(fd, "protocolo") ?? undefined });
  const destino = "/progresso";
  invalidarLeituras([{ fato: "medicoes" }], { destino });
  redirect(destino);
}
