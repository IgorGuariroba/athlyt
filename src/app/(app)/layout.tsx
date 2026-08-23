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
 * altura percentual resolve contra a viewport grande. `min-h-0` no `<main>`
 * é obrigatório, senão o item flex não encolhe abaixo do conteúdo.
 *
 * A `BottomNav` fica fixa na viewport; o padding inferior deste `<main>`
 * reserva a faixa tocável e impede que o último conteúdo seja coberto.
 * `relative` também estabelece o containing block dos controles absolutos
 * dentro das telas, impedindo que eles criem rolagem no documento raiz.
 * `tabIndex={0}` deixa o próprio scroll container disponível para PageUp,
 * PageDown e setas quando o foco chega nele por teclado.
 *
 * O `pt-[var(--safe-top)]` cobre o caso instalado na tela de início. Mesmo
 * com a status bar opaca (`src/app/layout.tsx`), o iPhone reserva o
 * inset superior em paisagem e em modelos com Dynamic Island durante a
 * transição de orientação; sem ele o primeiro título encosta no topo
 * físico. Vai no casco, e não no `<main>`, para que o padding não role
 * junto com o conteúdo.
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
    <div className="flex h-dvh flex-col overflow-hidden pt-[var(--safe-top)]">
      <main
        tabIndex={0}
        className="scrollbar-hidden relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-[calc(4rem+var(--safe-bottom))]"
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
