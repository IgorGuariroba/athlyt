import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/navigation/bottom-nav";

/**
 * Casco autenticado das quatro abas (Início, Diário, Progresso, Mais).
 * O middleware já bloqueia rotas sem sessão, mas a checagem aqui
 * garante que nenhum conteúdo do casco renderize sem `session.user`.
 *
 * A rolagem pertence ao documento, e não a um `<main>` aninhado com
 * `overflow-y-auto`. Isso permite que o navegador entregue o pull-to-refresh
 * nativo quando a página está no topo; não há indicador ou gesto paralelo
 * competindo com o comportamento da plataforma.
 *
 * A `BottomNav` fica fixa na viewport; o padding inferior deste `<main>`
 * reserva a faixa tocável e impede que o último conteúdo seja coberto.
 * `relative` estabelece o containing block dos controles absolutos dentro das
 * telas. `tabIndex={0}` deixa o conteúdo disponível para PageUp, PageDown e
 * setas quando o foco chega nele por teclado.
 *
 * O `pt-[var(--safe-top)]` cobre o caso instalado na tela de início. Mesmo
 * com a status bar opaca (`src/app/layout.tsx`), o iPhone reserva o inset
 * superior em paisagem e em modelos com Dynamic Island durante a transição
 * de orientação; sem ele o primeiro título encosta no topo físico.
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
    <div className="min-h-dvh pt-[var(--safe-top)]">
      <main
        tabIndex={0}
        className="relative flex min-h-dvh flex-col overflow-x-clip pb-[calc(4rem+var(--safe-bottom))]"
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
