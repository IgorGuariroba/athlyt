import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { obterSessao } from "@/domain/sessao/repositorio";

/**
 * Deep link estável para um exercício dentro de uma sessão.
 *
 * A tela da sessão mantém o índice na query string para trocar de exercício
 * sem criar uma segunda cópia da UI. Este alias usa o ID do exercício — que
 * é estável no plano — e traduz o link para o formato que a tela já entende.
 * Assim links salvos, notificações e atalhos da PWA continuam abrindo o
 * exercício certo mesmo que a posição dele no treino mude.
 */
export default async function ExercicioDeepLinkPage({
  params,
}: {
  params: Promise<{ id: string; exercicioId: string }>;
}) {
  const { id, exercicioId } = await params;
  const session = await auth();
  const sessao = session?.user?.id
    ? await obterSessao(session.user.id, id)
    : null;
  const indice = sessao?.exercicios.findIndex(
    (exercicio) => exercicio.exercicioId === exercicioId,
  ) ?? -1;

  if (!sessao || indice < 0) notFound();

  redirect(`/sessao/${id}?exercicio=${indice}`);
}
