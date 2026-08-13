import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/navigation/bottom-nav";

/**
 * Casco autenticado das quatro abas (Início, Diário, Progresso, Mais).
 * O middleware já bloqueia rotas sem sessão, mas a checagem aqui
 * garante que nenhum conteúdo do casco renderize sem `session.user`.
 *
 * A altura é travada em `h-dvh` (e não `min-h-*`) para que a rolagem
 * pertença ao `<main>`, nunca ao documento: com `viewportFit: "cover"`,
 * altura percentual resolve contra a viewport grande e o rodapé escorrega
 * para trás da barra do navegador. `min-h-0` no `<main>` é obrigatório,
 * senão o item flex não encolhe abaixo do conteúdo e volta a empurrar a
 * `BottomNav` para fora da tela.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
