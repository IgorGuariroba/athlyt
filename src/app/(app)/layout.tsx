import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/navigation/bottom-nav";

/**
 * Casco autenticado das quatro abas (Início, Diário, Progresso, Mais).
 * O middleware já bloqueia rotas sem sessão, mas a checagem aqui
 * garante que nenhum conteúdo do casco renderize sem `session.user`.
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
    <div className="flex min-h-full flex-1 flex-col">
      <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
