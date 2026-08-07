"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { recalcularMetasProporcao } from "@/domain/medicoes/repositorio";

export async function atualizarEnfasesCorporais(fd: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  await recalcularMetasProporcao(session.user.id, fd.getAll("enfases").map(String));
  revalidatePath("/progresso");
  revalidatePath("/inicio");
}
