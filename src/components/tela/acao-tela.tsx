import { cn } from "@/lib/utils";

/**
 * CTA principal no fluxo normal da tela — não `fixed`.
 *
 * Dentro do casco autenticado (`src/app/(app)/layout.tsx`), a
 * `BottomNav` já ocupa `fixed inset-x-0 bottom-0`. Um CTA com o mesmo
 * posicionamento (`BarraAcaoFixa`) compete pela mesma faixa: no
 * iPhone, a barra de endereço do Safari e do Chrome soma uma camada
 * extra sobre o inset de sistema, e o botão fica coberto por completo
 * em vez de só perder folga.
 *
 * `AcaoTela` resolve isso saindo do posicionamento fixo: o botão some
 * no fluxo, logo após o último conteúdo, sem entrar na faixa da
 * bottom nav. Use `BarraAcaoFixa` apenas fora do casco autenticado
 * (onboarding, `acesso-restrito`), onde não há bottom nav concorrendo.
 */
export function AcaoTela({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("px-6 pt-6 pb-8", className)}>
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
