/**
 * CTA principal ancorado ao rodapé (DESIGN.md > Layout: "CTA fixo
 * alinhado ao rodapé com 16px laterais e safe area inferior";
 * Components > Primary button: "um por viewport").
 *
 * O elemento fica fixo em vez de sticky porque a tela inteira rola:
 * sticky dentro de um `main` em coluna só cola no fim do conteúdo. O
 * espaço que ele ocupa é reservado por `TelaConteudo comAcaoFixa`.
 *
 * Este componente compartilha a faixa inferior com a `BottomNav`
 * (ambas `fixed bottom-0`): use-o só fora do casco autenticado (ex.:
 * onboarding, `acesso-restrito`), onde não há bottom nav para
 * competir pelo espaço. Dentro do casco autenticado, prefira o CTA
 * no fluxo normal da tela, após o último conteúdo — caso contrário,
 * no iPhone (Safari e Chrome), a barra do navegador soma outra camada
 * sobre essa faixa e cobre o botão por completo.
 */
export function BarraAcaoFixa({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-6 pt-3 pb-[max(0.75rem,var(--safe-bottom))] backdrop-blur">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
